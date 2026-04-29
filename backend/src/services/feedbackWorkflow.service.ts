/**
 * @file feedbackWorkflow.service.ts
 * @description Feedback status tracking, submission orchestration,
 * overdue detection, and reminder dispatch.
 */
import { prisma } from '../lib/prisma';
import { interviewsRepository } from '../repositories/interviews.repository';
import { notificationsService } from './notifications.service';

const FEEDBACK_OVERDUE_HOURS = Number(process.env.FEEDBACK_OVERDUE_HOURS ?? 24);

// ── Types ────────────────────────────────────────────────────────────────────

interface ScorecardInput {
  rating: number;
  recommendation: 'hire' | 'no-hire' | 'maybe';
  notes: string;
}

interface FeedbackRequestItem {
  userId: string;
  userName: string;
  status: 'PENDING' | 'SUBMITTED' | 'OVERDUE';
  submittedAt: string | null;
  scorecard: ScorecardInput | null;
  locked: boolean;
}

interface FeedbackStatusResponse {
  requests: FeedbackRequestItem[];
  summary: { total: number; submitted: number; pending: number; overdue: number };
}

type Role = 'ADMIN' | 'HR' | 'MANAGER' | 'INTERVIEWER';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCodedError(message: string, code: string): Error {
  const err = new Error(message);
  (err as Error & { code: string }).code = code;
  return err;
}

// ── Service ──────────────────────────────────────────────────────────────────

export const feedbackWorkflowService = {
  /**
   * Create FeedbackRequest records for each INTERVIEWER participant.
   * Idempotent: skips if requests already exist for this interview+user pair.
   */
  async createFeedbackRequests(interviewId: string): Promise<void> {
    const participants = await prisma.interviewParticipant.findMany({
      where: { interviewId, role: 'INTERVIEWER' },
      select: { userId: true },
    });

    if (participants.length === 0) return;

    // Check which requests already exist
    const existing = await prisma.feedbackRequest.findMany({
      where: { interviewId, userId: { in: participants.map((p) => p.userId) } },
      select: { userId: true },
    });
    const existingSet = new Set(existing.map((e) => e.userId));

    const toCreate = participants.filter((p) => !existingSet.has(p.userId));
    if (toCreate.length === 0) return;

    // Get the interview's candidateId + applicationId for timeline events
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { applicationId: true, application: { select: { candidateId: true } } },
    });
    if (!interview) return;

    await prisma.$transaction([
      prisma.feedbackRequest.createMany({
        data: toCreate.map((p) => ({
          interviewId,
          userId: p.userId,
          status: 'PENDING' as const,
        })),
        skipDuplicates: true,
      }),
      ...toCreate.map((p) =>
        prisma.timelineEvent.create({
          data: {
            candidateId: interview.application.candidateId,
            applicationId: interview.applicationId,
            actorId: p.userId,
            type: 'FEEDBACK_REQUESTED',
            metadata: { interviewId, userId: p.userId },
          },
        }),
      ),
    ]);
  },

  /**
   * Submit feedback for an interview. Wraps existing scorecard submission.
   * Creates FeedbackRequest on-demand if it doesn't exist (manually-scheduled interviews).
   */
  async submitFeedback(
    interviewId: string,
    userId: string,
    scorecardData: ScorecardInput,
  ): Promise<void> {
    // Find or create FeedbackRequest
    let feedbackRequest = await prisma.feedbackRequest.findUnique({
      where: { interviewId_userId: { interviewId, userId } },
    });

    if (feedbackRequest && feedbackRequest.status === 'SUBMITTED') {
      throw makeCodedError('Feedback already submitted', 'ALREADY_SUBMITTED');
    }

    // Call existing scorecard submission logic
    await interviewsRepository.submitFeedback(interviewId, {
      rating: scorecardData.rating,
      recommendation: scorecardData.recommendation,
      notes: scorecardData.notes,
    });

    if (!feedbackRequest) {
      // Create on-demand for manually-scheduled interviews
      feedbackRequest = await prisma.feedbackRequest.create({
        data: { interviewId, userId, status: 'SUBMITTED', submittedAt: new Date() },
      });
    } else {
      await prisma.feedbackRequest.update({
        where: { id: feedbackRequest.id },
        data: { status: 'SUBMITTED', submittedAt: new Date() },
      });
    }

    // Timeline event
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: {
        applicationId: true,
        application: { select: { candidateId: true } },
      },
    });
    if (interview) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      await prisma.timelineEvent.create({
        data: {
          candidateId: interview.application.candidateId,
          applicationId: interview.applicationId,
          actorId: userId,
          type: 'FEEDBACK_SUBMITTED',
          metadata: {
            interviewId,
            actorName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          },
        },
      });
    }
  },

  /**
   * Get feedback status for an interview with locking rules.
   */
  async getFeedbackStatus(
    interviewId: string,
    requestingUserId: string,
    requestingRole: Role,
  ): Promise<FeedbackStatusResponse> {
    const requests = await prisma.feedbackRequest.findMany({
      where: { interviewId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get the interview's feedback data (rating/recommendation/notes on the Interview row)
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { rating: true, recommendation: true, feedback: true },
    });

    const items: FeedbackRequestItem[] = requests.map((req) => {
      const isOwnRow = req.userId === requestingUserId;
      const isSubmitted = req.status === 'SUBMITTED';
      const isPrivileged = ['ADMIN', 'HR', 'MANAGER'].includes(requestingRole);

      // Locking rules:
      // INTERVIEWER: only sees their own row; scorecard if submitted
      // ADMIN/HR/MANAGER: sees all; scorecard only if that user submitted
      let scorecard: ScorecardInput | null = null;
      let locked = !isSubmitted;

      if (isSubmitted && interview?.rating != null) {
        if (requestingRole === 'INTERVIEWER') {
          // Only show own scorecard
          if (isOwnRow) {
            scorecard = {
              rating: interview.rating,
              recommendation: (interview.recommendation ?? 'maybe') as ScorecardInput['recommendation'],
              notes: interview.feedback ?? '',
            };
          }
        } else if (isPrivileged) {
          scorecard = {
            rating: interview.rating,
            recommendation: (interview.recommendation ?? 'maybe') as ScorecardInput['recommendation'],
            notes: interview.feedback ?? '',
          };
        }
      }

      return {
        userId: req.userId,
        userName: `${req.user.firstName} ${req.user.lastName}`,
        status: req.status,
        submittedAt: req.submittedAt?.toISOString() ?? null,
        scorecard,
        locked,
      };
    });

    // INTERVIEWER: filter to only own row
    const filtered = requestingRole === 'INTERVIEWER'
      ? items.filter((i) => i.userId === requestingUserId)
      : items;

    const summary = {
      total: filtered.length,
      submitted: filtered.filter((r) => r.status === 'SUBMITTED').length,
      pending: filtered.filter((r) => r.status === 'PENDING').length,
      overdue: filtered.filter((r) => r.status === 'OVERDUE').length,
    };

    return { requests: filtered, summary };
  },

  /**
   * Find overdue feedback requests and send reminders.
   * Idempotent: won't re-send if reminderSentAt was set today.
   */
  async processOverdueFeedback(): Promise<{ processed: number }> {
    const now = new Date();
    const overdueThreshold = new Date(now.getTime() - FEEDBACK_OVERDUE_HOURS * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const overdue = await prisma.feedbackRequest.findMany({
      where: {
        status: { in: ['PENDING', 'OVERDUE'] },
        interview: {
          scheduledAt: { lt: overdueThreshold },
          status: { not: 'CANCELLED' },
        },
        OR: [
          { reminderSentAt: null },
          { reminderSentAt: { lt: oneDayAgo } },
        ],
      },
      include: {
        user: { select: { id: true, firstName: true, email: true } },
        interview: {
          select: {
            id: true,
            applicationId: true,
            scheduledAt: true,
            application: {
              select: {
                candidateId: true,
                candidate: { select: { firstName: true, lastName: true } },
                jobPosting: { select: { title: true } },
              },
            },
          },
        },
      },
    });

    let processed = 0;

    for (const req of overdue) {
      const candidateName = `${req.interview.application.candidate.firstName} ${req.interview.application.candidate.lastName}`;
      const jobTitle = req.interview.application.jobPosting.title;

      await prisma.$transaction([
        prisma.feedbackRequest.update({
          where: { id: req.id },
          data: { status: 'OVERDUE', reminderSentAt: now },
        }),
        prisma.timelineEvent.create({
          data: {
            candidateId: req.interview.application.candidateId,
            applicationId: req.interview.applicationId,
            actorId: req.userId,
            type: 'FEEDBACK_REMINDER_SENT',
            metadata: { interviewId: req.interviewId, userId: req.userId },
          },
        }),
      ]);

      // Send notification
      await notificationsService.push(req.userId, {
        type: 'application',
        title: 'Feedback reminder',
        message: `Your feedback for ${candidateName} (${jobTitle}) is overdue`,
        href: `/interviews`,
      });

      processed++;
    }

    return { processed };
  },
};
