import { prisma } from '../lib/prisma';
import path from 'path';

/**
 * Generates a structured JSON export of all data held on a candidate.
 * NEVER includes: binary file content, passwordHash, full cvUrl, internal user IDs.
 */
export async function generateCandidateExport(candidateId: string): Promise<object> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      applications: {
        include: {
          jobPosting: { select: { title: true } },
          interviews: {
            select: {
              type: true,
              scheduledAt: true,
              feedback: true,
              status: true,
            },
          },
        },
      },
      evaluations: {
        include: {
          jobPosting: { select: { title: true } },
        },
      },
      rightsRequests: {
        select: {
          requestType: true,
          status: true,
          receivedAt: true,
          fulfilledAt: true,
        },
      },
    },
  });

  if (!candidate) throw new Error('Candidate not found');

  return {
    exportedAt: new Date().toISOString(),
    exportVersion: '1.0',
    personalDetails: {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
      currentCompany: candidate.currentCompany,
      linkedInUrl: candidate.linkedInUrl,
    },
    cv: {
      fileReference: candidate.cvUrl ? path.basename(candidate.cvUrl) : null,
      uploadedAt: null,
    },
    applications: candidate.applications.map((app) => ({
      jobTitle: app.jobPosting.title,
      appliedAt: app.appliedAt.toISOString(),
      currentStage: app.stage ?? app.status,
      outcome: app.status,
    })),
    interviewFeedback: candidate.applications.flatMap((app) =>
      app.interviews
        .filter((iv) => iv.feedback)
        .map((iv) => ({
          stage: iv.type,
          submittedAt: iv.scheduledAt.toISOString(),
          submittedBy: null,
          feedback: iv.feedback,
        })),
    ),
    evaluations: candidate.evaluations.map((ev) => ({
      jobTitle: ev.jobPosting.title,
      stage: ev.stageId ?? null,
      submittedAt: ev.createdAt.toISOString(),
      outcome: ev.overallRecommendation ?? null,
    })),
    privacyRecord: {
      legalBasis: candidate.legalBasis,
      privacyNoticeSentAt: candidate.privacyNoticeSentAt?.toISOString() ?? null,
      retentionExpiresAt: candidate.retentionExpiresAt?.toISOString() ?? null,
    },
    rightsRequestHistory: candidate.rightsRequests.map((rr) => ({
      requestType: rr.requestType,
      status: rr.status,
      receivedAt: rr.receivedAt.toISOString(),
      fulfilledAt: rr.fulfilledAt?.toISOString() ?? null,
    })),
  };
}
