/**
 * @file scheduling.service.ts
 * @description Slot suggestions, scheduling links, candidate self-booking,
 * reschedule, and cancel logic for interview scheduling.
 *
 * Creates InterviewParticipant, CalendarEventMapping, TimelineEvent,
 * FeedbackRequest, and in-app Notification records. Email sending is
 * stubbed via TODO comments — no email provider is currently configured.
 */
import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma';
import { schedulingLinkRepository } from '../repositories/schedulingLink.repository';
import { interviewsRepository } from '../repositories/interviews.repository';
import { calendarIntegrationService } from './calendarIntegration.service';
import { calendarIntegrationRepository } from '../repositories/calendarIntegration.repository';
import { notificationsService } from './notifications.service';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TimeSlot {
  start: string; // ISO
  end: string;   // ISO
}

export interface SuggestSlotsParams {
  interviewerUserIds: string[];
  durationMinutes: number;
  bufferBefore: number;
  bufferAfter: number;
  windowStart: Date;
  windowEnd: Date;
  timezone: string;
}

export interface SuggestSlotsResult {
  slots: TimeSlot[];
  warnings?: string[];
}

export interface CreateLinkParams {
  applicationId: string;
  interviewerUserIds: string[];
  durationMinutes: number;
  bufferBefore: number;
  bufferAfter: number;
  expiresInHours: number;
  timezone: string;
  createdById: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_SLOTS = 20;
const DEFAULT_WORK_START = parseInt(process.env.SCHEDULING_BUSINESS_HOURS_START ?? '9', 10);
const DEFAULT_WORK_END   = parseInt(process.env.SCHEDULING_BUSINESS_HOURS_END ?? '18', 10);

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Given a list of busy intervals and a working-hours window,
 * returns available slots of the requested duration.
 */
function findAvailableSlots(
  busyIntervals: { start: Date; end: Date }[],
  rangeStart: Date,
  rangeEnd: Date,
  durationMs: number,
  bufferBeforeMs: number,
  bufferAfterMs: number,
  workStart: number,
  workEnd: number,
): TimeSlot[] {
  const sorted = [...busyIntervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const slots: TimeSlot[] = [];
  const totalSlotMs = bufferBeforeMs + durationMs + bufferAfterMs;

  function fillGap(from: number, to: number) {
    if (to - from < totalSlotMs) return;
    let slotStart = from + bufferBeforeMs;
    while (slotStart + durationMs + bufferAfterMs <= to && slots.length < MAX_SLOTS) {
      slots.push({
        start: new Date(slotStart).toISOString(),
        end: new Date(slotStart + durationMs).toISOString(),
      });
      slotStart += 30 * 60 * 1000;
    }
  }

  const cursor = new Date(rangeStart);
  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor <= rangeEnd && slots.length < MAX_SLOTS) {
    const dayStart = new Date(cursor);
    dayStart.setUTCHours(workStart, 0, 0, 0);
    const dayEnd = new Date(cursor);
    dayEnd.setUTCHours(workEnd, 0, 0, 0);

    if (dayEnd <= rangeStart || dayStart >= rangeEnd) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      continue;
    }

    // Skip weekends
    const dow = cursor.getUTCDay();
    if (dow === 0 || dow === 6) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      continue;
    }

    const effectiveStart = dayStart > rangeStart ? dayStart : rangeStart;
    const effectiveEnd = dayEnd < rangeEnd ? dayEnd : rangeEnd;

    const dayBusy = sorted.filter(
      (b) => b.end > effectiveStart && b.start < effectiveEnd,
    );

    let windowStart = effectiveStart.getTime();
    for (const busy of dayBusy) {
      fillGap(windowStart, busy.start.getTime());
      windowStart = Math.max(windowStart, busy.end.getTime() + bufferAfterMs);
    }
    fillGap(windowStart, effectiveEnd.getTime());

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return slots;
}

// ─── Service ────────────────────────────────────────────────────────────────

export const schedulingService = {
  /**
   * Suggest available interview slots based on interviewer calendar availability.
   * If an interviewer has no calendar connected, treats them as fully available
   * and attaches a warning to the response.
   */
  async suggestSlots(params: SuggestSlotsParams): Promise<SuggestSlotsResult> {
    const {
      interviewerUserIds,
      durationMinutes,
      bufferBefore,
      bufferAfter,
      windowStart,
      windowEnd,
    } = params;

    const warnings: string[] = [];

    // Check which interviewers have calendars connected
    const calendarStatuses = await Promise.all(
      interviewerUserIds.map(async (uid) => {
        const record = await calendarIntegrationRepository.findStatusByUserId(uid);
        return { userId: uid, connected: !!(record && record.isActive) };
      }),
    );

    const connectedUserIds = calendarStatuses.filter((s) => s.connected).map((s) => s.userId);
    const disconnectedUserIds = calendarStatuses.filter((s) => !s.connected).map((s) => s.userId);

    if (disconnectedUserIds.length > 0) {
      // Fetch names for warning message
      const users = await prisma.user.findMany({
        where: { id: { in: disconnectedUserIds } },
        select: { firstName: true, lastName: true },
      });
      const names = users.map((u) => `${u.firstName} ${u.lastName}`);
      warnings.push(
        `${names.join(', ')} ${names.length === 1 ? 'does' : 'do'} not have a calendar connected — treated as fully available`,
      );
    }

    // Fetch busy intervals only from connected users
    let busyMap: Record<string, { start: string; end: string }[]> = {};
    if (connectedUserIds.length > 0) {
      busyMap = await calendarIntegrationService.getFreeBusy(
        connectedUserIds,
        windowStart,
        windowEnd,
      );
    }

    // Merge all busy intervals
    const allBusy: { start: Date; end: Date }[] = [];
    for (const intervals of Object.values(busyMap)) {
      for (const b of intervals) {
        allBusy.push({ start: new Date(b.start), end: new Date(b.end) });
      }
    }

    // Merge overlapping intervals
    allBusy.sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: { start: Date; end: Date }[] = [];
    for (const interval of allBusy) {
      const last = merged[merged.length - 1];
      if (last && interval.start <= last.end) {
        last.end = interval.end > last.end ? interval.end : last.end;
      } else {
        merged.push({ ...interval });
      }
    }

    const slots = findAvailableSlots(
      merged,
      windowStart,
      windowEnd,
      durationMinutes * 60 * 1000,
      bufferBefore * 60 * 1000,
      bufferAfter * 60 * 1000,
      DEFAULT_WORK_START,
      DEFAULT_WORK_END,
    );

    return { slots, ...(warnings.length > 0 ? { warnings } : {}) };
  },

  /**
   * Create a scheduling link with pre-selected time slots for candidate self-booking.
   * Sends scheduling link email (TODO: email provider), creates TimelineEvent.
   */
  async createSchedulingLink(params: CreateLinkParams) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + params.expiresInHours * 60 * 60 * 1000);

    // First generate slots from calendar availability
    const { slots: suggestedSlots } = await schedulingService.suggestSlots({
      interviewerUserIds: params.interviewerUserIds,
      durationMinutes: params.durationMinutes,
      bufferBefore: params.bufferBefore,
      bufferAfter: params.bufferAfter,
      windowStart: new Date(),
      windowEnd: expiresAt,
      timezone: params.timezone,
    });

    const link = await schedulingLinkRepository.create({
      applicationId: params.applicationId,
      token,
      durationMinutes: params.durationMinutes,
      bufferBefore: params.bufferBefore,
      bufferAfter: params.bufferAfter,
      expiresAt,
      timezone: params.timezone,
      createdById: params.createdById,
    });

    // Create slot records
    let createdSlots: { id: string; startTime: Date; endTime: Date }[] = [];
    if (suggestedSlots.length > 0) {
      createdSlots = await schedulingLinkRepository.createSlots(
        link.id,
        suggestedSlots.map((s) => ({
          startTime: new Date(s.start),
          endTime: new Date(s.end),
        })),
      );
    }

    // Store interviewerUserIds as JSON metadata on the link (via timeline event)
    // since the SchedulingLink model doesn't have an interviewerUserIds column

    // Create TimelineEvent: SCHEDULING_LINK_SENT
    const application = await prisma.application.findUnique({
      where: { id: params.applicationId },
      select: { candidateId: true },
    });
    if (application) {
      await prisma.timelineEvent.create({
        data: {
          candidateId: application.candidateId,
          applicationId: params.applicationId,
          actorId: params.createdById,
          type: 'SCHEDULING_LINK_SENT',
          metadata: {
            schedulingLinkId: link.id,
            interviewerUserIds: params.interviewerUserIds,
            durationMinutes: params.durationMinutes,
            slotCount: createdSlots.length,
          },
        },
      });
    }

    // TODO: Send candidate_scheduling email via email provider
    // The codebase has no email sending implementation yet.
    // When available, use tokenResolver.resolveTokens() with the scheduling link URL.

    return {
      ...link,
      slots: createdSlots,
    };
  },

  /**
   * Get scheduling link details by token (for the public self-scheduling page).
   * Returns ONLY safe public data — no candidate PII, no internal IDs.
   */
  async getPublicLink(token: string) {
    const link = await schedulingLinkRepository.findByToken(token);
    if (!link) return null;

    const now = new Date();
    const isExpired = link.expiresAt < now;
    const isUsed = link.usedAt !== null;

    // Return only safe public-facing data
    return {
      jobTitle: link.application.jobPosting.title,
      companyName: process.env.COMPANY_NAME ?? 'TeamTalent',
      durationMinutes: link.durationMinutes,
      timezone: link.timezone,
      expiresAt: link.expiresAt.toISOString(),
      isExpired,
      isUsed,
      slots: link.slots
        .filter((s) => !s.isBooked)
        .map((s) => ({
          id: s.id,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
        })),
    };
  },

  /**
   * Candidate books a slot — creates Interview, InterviewParticipant, CalendarEventMapping,
   * TimelineEvent, FeedbackRequest, and sends notifications.
   * Idempotent: double submit returns 409.
   */
  async bookSlot(token: string, slotId: string) {
    // Pre-validate outside transaction
    const link = await schedulingLinkRepository.findByToken(token);
    if (!link) {
      throw Object.assign(new Error('Scheduling link not found'), { code: 'LINK_NOT_FOUND' });
    }
    if (link.usedAt) {
      throw Object.assign(new Error('This scheduling link has already been used'), { code: 'LINK_ALREADY_USED' });
    }
    if (link.expiresAt < new Date()) {
      throw Object.assign(new Error('This scheduling link has expired'), { code: 'LINK_EXPIRED' });
    }

    const slot = link.slots.find((s) => s.id === slotId);
    if (!slot) {
      throw Object.assign(new Error('Slot not found'), { code: 'SLOT_NOT_FOUND' });
    }
    if (slot.isBooked) {
      throw Object.assign(new Error('This slot is no longer available'), { code: 'SLOT_ALREADY_BOOKED' });
    }

    // Get interviewerUserIds from the TimelineEvent metadata
    const timelineEvent = await prisma.timelineEvent.findFirst({
      where: {
        applicationId: link.applicationId,
        type: 'SCHEDULING_LINK_SENT',
        metadata: { path: ['schedulingLinkId'], equals: link.id },
      },
    });
    const interviewerUserIds: string[] =
      (timelineEvent?.metadata as { interviewerUserIds?: string[] } | null)?.interviewerUserIds ?? [];

    // Atomic booking transaction
    const interview = await prisma.$transaction(async (tx) => {
      // Atomically claim the slot
      const updated = await tx.schedulingLinkSlot.updateMany({
        where: { id: slotId, isBooked: false },
        data: { isBooked: true },
      });
      if (updated.count === 0) {
        throw Object.assign(new Error('This slot is no longer available'), { code: 'SLOT_ALREADY_BOOKED' });
      }

      // Mark link as used
      await tx.schedulingLink.update({
        where: { id: link.id },
        data: { usedAt: new Date() },
      });

      // Create Interview via existing pattern
      const iv = await interviewsRepository.create({
        applicationId: link.applicationId,
        type: 'VIDEO', // Default for self-scheduled
        scheduledAt: slot.startTime,
        duration: link.durationMinutes,
      });

      // Create InterviewParticipant records for each interviewer
      if (interviewerUserIds.length > 0) {
        await tx.interviewParticipant.createMany({
          data: interviewerUserIds.map((userId) => ({
            interviewId: iv.id,
            userId,
            role: 'INTERVIEWER' as const,
          })),
        });
      }

      // Create CalendarEventMapping (placeholder — actual Google event creation below)
      await tx.calendarEventMapping.create({
        data: {
          interviewId: iv.id,
          externalEventId: '', // Updated after Google Calendar API call
          provider: 'GOOGLE',
          calendarId: 'primary',
        },
      });

      // Create TimelineEvent: INTERVIEW_SCHEDULED
      await tx.timelineEvent.create({
        data: {
          candidateId: link.application.candidate.id,
          applicationId: link.applicationId,
          type: 'INTERVIEW_SCHEDULED',
          metadata: {
            interviewId: iv.id,
            scheduledAt: slot.startTime.toISOString(),
            duration: link.durationMinutes,
            source: 'self_scheduling',
          },
        },
      });

      // Create FeedbackRequest for each INTERVIEWER participant
      if (interviewerUserIds.length > 0) {
        await tx.feedbackRequest.createMany({
          data: interviewerUserIds.map((userId) => ({
            interviewId: iv.id,
            userId,
            status: 'PENDING' as const,
          })),
        });
      }

      return iv;
    });

    // Post-transaction: Google Calendar event creation (best-effort, non-blocking)
    try {
      // Try to create Google Calendar event for the link creator
      const creatorCalendar = await calendarIntegrationRepository.findStatusByUserId(link.createdById);
      if (creatorCalendar && creatorCalendar.isActive) {
        const accessToken = await calendarIntegrationService.refreshTokenIfExpired(link.createdById);
        const candidateName = `${link.application.candidate.firstName} ${link.application.candidate.lastName}`;
        const jobTitle = link.application.jobPosting.title;

        const eventRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: `Interview: ${candidateName} — ${jobTitle}`,
            start: { dateTime: slot.startTime.toISOString() },
            end: { dateTime: slot.endTime.toISOString() },
            description: `Candidate: ${candidateName}\nJob: ${jobTitle}\nDuration: ${link.durationMinutes} min`,
          }),
        });

        if (eventRes.ok) {
          const eventBody = await eventRes.json() as { id?: string };
          if (eventBody.id) {
            await prisma.calendarEventMapping.updateMany({
              where: { interviewId: interview.id },
              data: { externalEventId: eventBody.id, calendarId: creatorCalendar.calendarId },
            });
          }
        }
      }
    } catch {
      // Calendar event creation failure is non-critical
    }

    // Send in-app notifications to interviewers
    const candidateName = `${link.application.candidate.firstName} ${link.application.candidate.lastName}`;
    for (const userId of interviewerUserIds) {
      void notificationsService.push(userId, {
        type: 'interview',
        title: 'Interview Scheduled',
        message: `Interview with ${candidateName} on ${slot.startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
        href: `/interviews`,
      }).catch(() => {});
    }

    // Notify the link creator too
    void notificationsService.push(link.createdById, {
      type: 'interview',
      title: 'Candidate Booked Interview',
      message: `${candidateName} booked an interview slot`,
      href: `/interviews`,
    }).catch(() => {});

    // TODO: Send interview_confirmation email to candidate
    // TODO: Send notification email to each interviewer

    return interview;
  },

  /**
   * Reschedule an existing interview.
   * Verifies requesting user has access to the interview's job.
   */
  async rescheduleInterview(
    interviewId: string,
    newStart: Date,
    newEnd: Date,
    requestingUserId: string,
  ) {
    const existing = await interviewsRepository.findById(interviewId);
    if (!existing) {
      throw Object.assign(new Error('Interview not found'), { code: 'NOT_FOUND' });
    }
    if (existing.status === 'CANCELLED') {
      throw Object.assign(new Error('Cannot reschedule a cancelled interview'), { code: 'ALREADY_CANCELLED' });
    }

    // Verify access: user must be a member of the job or ADMIN/HR
    const user = await prisma.user.findUnique({ where: { id: requestingUserId }, select: { role: true } });
    if (user?.role !== 'ADMIN' && user?.role !== 'HR') {
      const jobMember = await prisma.jobMember.findFirst({
        where: { jobId: existing.application.jobPosting.id, userId: requestingUserId },
      });
      if (!jobMember) {
        throw Object.assign(new Error('You do not have access to this interview'), { code: 'FORBIDDEN' });
      }
    }

    const durationMinutes = Math.round((newEnd.getTime() - newStart.getTime()) / 60000);

    const updated = await interviewsRepository.update(interviewId, {
      scheduledAt: newStart,
      duration: durationMinutes,
      status: 'SCHEDULED',
    });

    // Update Google Calendar event if mapping exists
    try {
      const mapping = await prisma.calendarEventMapping.findUnique({ where: { interviewId } });
      if (mapping && mapping.externalEventId) {
        // Find the calendar owner (link creator or first participant)
        const participant = await prisma.interviewParticipant.findFirst({
          where: { interviewId },
          select: { userId: true },
        });
        const calOwner = participant?.userId;
        if (calOwner) {
          const accessToken = await calendarIntegrationService.refreshTokenIfExpired(calOwner);
          await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${mapping.calendarId}/events/${mapping.externalEventId}`,
            {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                start: { dateTime: newStart.toISOString() },
                end: { dateTime: newEnd.toISOString() },
              }),
            },
          );
        }
      }
    } catch {
      // Calendar update failure is non-critical
    }

    // Create TimelineEvent: INTERVIEW_RESCHEDULED
    await prisma.timelineEvent.create({
      data: {
        candidateId: existing.application.candidate.id,
        applicationId: existing.applicationId,
        actorId: requestingUserId,
        type: 'INTERVIEW_RESCHEDULED',
        metadata: {
          interviewId,
          oldScheduledAt: existing.scheduledAt.toISOString(),
          newScheduledAt: newStart.toISOString(),
        },
      },
    });

    // TODO: Send interview_reschedule email to candidate and participants

    return updated;
  },

  /**
   * Cancel an interview with optional reason.
   * Verifies requesting user has access.
   */
  async cancelInterview(interviewId: string, reason: string | undefined, requestingUserId: string) {
    const existing = await interviewsRepository.findById(interviewId);
    if (!existing) {
      throw Object.assign(new Error('Interview not found'), { code: 'NOT_FOUND' });
    }
    if (existing.status === 'CANCELLED') {
      throw Object.assign(new Error('Interview is already cancelled'), { code: 'ALREADY_CANCELLED' });
    }

    // Verify access
    const user = await prisma.user.findUnique({ where: { id: requestingUserId }, select: { role: true } });
    if (user?.role !== 'ADMIN' && user?.role !== 'HR') {
      const jobMember = await prisma.jobMember.findFirst({
        where: { jobId: existing.application.jobPosting.id, userId: requestingUserId },
      });
      if (!jobMember) {
        throw Object.assign(new Error('You do not have access to this interview'), { code: 'FORBIDDEN' });
      }
    }

    const updateData: Parameters<typeof interviewsRepository.update>[1] = {
      status: 'CANCELLED',
    };
    if (reason) {
      updateData.notes = `${existing.notes ? existing.notes + '\n' : ''}Cancellation reason: ${reason}`;
    }

    await interviewsRepository.update(interviewId, updateData);

    // Cancel Google Calendar event
    try {
      const mapping = await prisma.calendarEventMapping.findUnique({ where: { interviewId } });
      if (mapping && mapping.externalEventId) {
        const participant = await prisma.interviewParticipant.findFirst({
          where: { interviewId },
          select: { userId: true },
        });
        const calOwner = participant?.userId;
        if (calOwner) {
          const accessToken = await calendarIntegrationService.refreshTokenIfExpired(calOwner);
          await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${mapping.calendarId}/events/${mapping.externalEventId}`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
          );
        }
      }
    } catch {
      // Calendar cancel failure is non-critical
    }

    // Create TimelineEvent: INTERVIEW_CANCELLED
    await prisma.timelineEvent.create({
      data: {
        candidateId: existing.application.candidate.id,
        applicationId: existing.applicationId,
        actorId: requestingUserId,
        type: 'INTERVIEW_CANCELLED',
        metadata: { interviewId, reason: reason ?? null },
      },
    });

    // TODO: Send interview_cancellation email to candidate and participants
  },

  /**
   * Get scheduling links for an application (internal, for the links list view).
   */
  async getLinksByApplication(applicationId: string) {
    const links = await schedulingLinkRepository.findByApplicationId(applicationId);
    return links.map((link) => ({
      id: link.id,
      token: link.token,
      durationMinutes: link.durationMinutes,
      timezone: link.timezone,
      expiresAt: link.expiresAt.toISOString(),
      usedAt: link.usedAt?.toISOString() ?? null,
      createdBy: `${link.createdBy.firstName} ${link.createdBy.lastName}`,
      createdAt: link.createdAt.toISOString(),
      slotCount: link.slots.length,
      bookedSlots: link.slots.filter((s) => s.isBooked).length,
    }));
  },
};
