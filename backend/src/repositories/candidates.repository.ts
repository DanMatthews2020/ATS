/**
 * @file candidates.repository.ts
 * @description Database access layer for candidates and their applications.
 */
import { prisma } from '../lib/prisma';
import type { ApplicationStatus, LegalBasis, Prisma } from '@prisma/client';

export const candidatesRepository = {
  // ── Existing: applications tracking list ──────────────────────────────────
  async findApplications(params: {
    skip: number;
    take: number;
    status?: ApplicationStatus;
    jobPostingId?: string;
  }) {
    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.jobPostingId ? { jobPostingId: params.jobPostingId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { updatedAt: 'desc' },
        include: {
          candidate: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          jobPosting: {
            select: { id: true, title: true, department: true },
          },
        },
      }),
      prisma.application.count({ where }),
    ]);

    return { items, total };
  },

  // ── New: paginated candidate list with latest application ──────────────────
  async findMany(params: { skip: number; take: number; search?: string }) {
    const where: Prisma.CandidateWhereInput = {
      deletedAt: null, // Exclude soft-deleted candidates
      ...(params.search
        ? {
            OR: [
              { firstName: { contains: params.search, mode: 'insensitive' } },
              { lastName:  { contains: params.search, mode: 'insensitive' } },
              { email:     { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: {
          // Only the single most recent application per candidate
          applications: {
            orderBy: { appliedAt: 'desc' },
            take: 1,
            include: {
              jobPosting: { select: { title: true, department: true } },
            },
          },
        },
      }),
      prisma.candidate.count({ where }),
    ]);

    return { items, total };
  },

  // ── New: single candidate with full application + interview history ─────────
  async findById(id: string) {
    return prisma.candidate.findUnique({
      where: { id },
      include: {
        referrals: {
          orderBy: { createdAt: 'desc' },
        },
        applications: {
          orderBy: { appliedAt: 'desc' },
          include: {
            jobPosting: {
              select: { id: true, title: true, department: true, location: true },
            },
            interviews: {
              orderBy: { scheduledAt: 'desc' },
              select: {
                id: true,
                scheduledAt: true,
                type: true,
                status: true,
                feedback: true,
                rating: true,
                duration: true,
              },
            },
            offer: {
              select: {
                id: true,
                salary: true,
                currency: true,
                status: true,
                sentAt: true,
                expiresAt: true,
              },
            },
          },
        },
      },
    });
  },

  // ── New: create candidate ─────────────────────────────────────────────────
  async create(data: Prisma.CandidateCreateInput) {
    return prisma.candidate.create({ data });
  },

  // ── CandidateNote CRUD ────────────────────────────────────────────────────
  async findNotes(candidateId: string) {
    return prisma.candidateNote.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
      include: { application: { select: { jobPosting: { select: { title: true } } } } },
    });
  },

  async createNote(data: { candidateId: string; applicationId?: string; content: string; authorName: string }) {
    return prisma.candidateNote.create({
      data,
      include: { application: { select: { jobPosting: { select: { title: true } } } } },
    });
  },

  async updateNote(id: string, content: string) {
    return prisma.candidateNote.update({
      where: { id },
      data: { content, updatedAt: new Date() },
      include: { application: { select: { jobPosting: { select: { title: true } } } } },
    });
  },

  async deleteNote(id: string) {
    return prisma.candidateNote.delete({ where: { id } });
  },

  async update(id: string, data: { currentCompany?: string | null }) {
    return prisma.candidate.update({ where: { id }, data });
  },

  async updateTags(id: string, tags: string[]) {
    return prisma.candidate.update({ where: { id }, data: { tags } });
  },

  async deleteById(id: string) {
    return prisma.candidate.delete({ where: { id } });
  },

  async softDelete(id: string, userId: string, reason: string) {
    return prisma.candidate.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId, deletedReason: reason },
    });
  },

  async restore(id: string) {
    return prisma.candidate.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null, deletedReason: null },
    });
  },

  async findDeleted() {
    return prisma.candidate.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, firstName: true, lastName: true, email: true, deletedAt: true, deletedReason: true },
      orderBy: { deletedAt: 'desc' },
    });
  },

  async updateDoNotContact(id: string, data: {
    doNotContact: boolean;
    doNotContactReason?: string | null;
    doNotContactNote?: string | null;
    doNotContactAt?: Date | null;
  }) {
    return prisma.candidate.update({ where: { id }, data });
  },

  async unenrollAllSequences(candidateId: string) {
    return prisma.sequenceEnrollment.updateMany({
      where: { candidateId, status: 'ACTIVE' },
      data: { status: 'STOPPED', stoppedAt: new Date(), stoppedReason: 'Do Not Contact' },
    });
  },

  async findReferrals(candidateId: string) {
    return prisma.referral.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async merge(keepId: string, mergeId: string, fieldResolutions: Record<string, 'keep' | 'merge'>): Promise<void> {
    const mergeCandidate = await prisma.candidate.findUnique({ where: { id: mergeId } });
    if (!mergeCandidate) throw new Error('Merge candidate not found');

    await prisma.$transaction(async (tx) => {
      // Identify conflicting applications (same job already in keepId pipeline)
      const keepJobIds = new Set(
        (await tx.application.findMany({ where: { candidateId: keepId }, select: { jobPostingId: true } }))
          .map(a => a.jobPostingId)
      );
      const mergeApps = await tx.application.findMany({ where: { candidateId: mergeId } });
      const conflictingAppIds = mergeApps.filter(a => keepJobIds.has(a.jobPostingId)).map(a => a.id);

      // Detach notes from conflicting apps before deletion
      if (conflictingAppIds.length > 0) {
        await tx.candidateNote.updateMany({
          where: { applicationId: { in: conflictingAppIds } },
          data: { applicationId: null },
        });
        await tx.application.deleteMany({ where: { id: { in: conflictingAppIds } } });
      }

      // Move all remaining records to keepId
      await tx.candidateNote.updateMany({ where: { candidateId: mergeId }, data: { candidateId: keepId } });
      await tx.application.updateMany({ where: { candidateId: mergeId }, data: { candidateId: keepId } });
      await tx.candidateEvaluation.updateMany({ where: { candidateId: mergeId }, data: { candidateId: keepId } });
      await tx.followUp.updateMany({ where: { candidateId: mergeId }, data: { candidateId: keepId } });
      await tx.feedbackSubmission.updateMany({ where: { candidateId: mergeId }, data: { candidateId: keepId } });
      await tx.referral.updateMany({ where: { candidateId: mergeId }, data: { candidateId: keepId } });

      // Project candidates — skip conflicts
      const keepProjectIds = new Set(
        (await tx.projectCandidate.findMany({ where: { candidateId: keepId }, select: { projectId: true } }))
          .map(p => p.projectId)
      );
      for (const pc of await tx.projectCandidate.findMany({ where: { candidateId: mergeId } })) {
        if (!keepProjectIds.has(pc.projectId)) {
          await tx.projectCandidate.update({ where: { id: pc.id }, data: { candidateId: keepId } });
        }
      }

      // Sequence enrollments — skip conflicts
      const keepSeqIds = new Set(
        (await tx.sequenceEnrollment.findMany({ where: { candidateId: keepId }, select: { sequenceId: true } }))
          .map(s => s.sequenceId)
      );
      for (const se of await tx.sequenceEnrollment.findMany({ where: { candidateId: mergeId } })) {
        if (!keepSeqIds.has(se.sequenceId)) {
          await tx.sequenceEnrollment.update({ where: { id: se.id }, data: { candidateId: keepId } });
        }
      }

      // Detach Employee if any (no cascade on Employee.candidateId)
      await tx.employee.updateMany({ where: { candidateId: mergeId }, data: { candidateId: null } });

      // Apply field resolutions
      const updateData: Record<string, unknown> = {};
      const allowedFields = ['firstName', 'lastName', 'phone', 'linkedInUrl', 'location', 'skills', 'tags'];
      for (const [field, resolution] of Object.entries(fieldResolutions)) {
        if (resolution === 'merge' && allowedFields.includes(field)) {
          updateData[field] = (mergeCandidate as Record<string, unknown>)[field];
        }
      }
      if (Object.keys(updateData).length > 0) {
        await tx.candidate.update({ where: { id: keepId }, data: updateData });
      }

      // Delete merge candidate — cascade removes remaining records
      await tx.candidate.delete({ where: { id: mergeId } });
    });
  },

  // ── Privacy & Consent ────────────────────────────────────────────────────

  async getPrivacy(id: string) {
    return prisma.candidate.findUnique({
      where: { id },
      select: {
        legalBasis: true,
        privacyNoticeSentAt: true,
        privacyNoticeSentBy: true,
        consentGivenAt: true,
        consentScope: true,
        retentionExpiresAt: true,
        retentionNote: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
  },

  async updatePrivacy(id: string, data: {
    legalBasis?: LegalBasis;
    consentGivenAt?: Date | null;
    consentScope?: string | null;
    retentionExpiresAt?: Date | null;
    retentionNote?: string | null;
  }) {
    return prisma.candidate.update({ where: { id }, data });
  },

  async markPrivacyNoticeSent(id: string, userId: string) {
    return prisma.candidate.update({
      where: { id },
      data: { privacyNoticeSentAt: new Date(), privacyNoticeSentBy: userId },
    });
  },

  async findFeedData(candidateId: string) {
    return prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        applications: {
          orderBy: { appliedAt: 'asc' },
          include: {
            jobPosting: { select: { title: true } },
            interviews: {
              orderBy: { scheduledAt: 'asc' },
              select: {
                id: true,
                scheduledAt: true,
                type: true,
                status: true,
                feedback: true,
                rating: true,
                recommendation: true,
                createdAt: true,
              },
            },
            offer: {
              select: {
                id: true,
                status: true,
                sentAt: true,
                acceptedAt: true,
                respondedAt: true,
              },
            },
          },
        },
        notes: { orderBy: { createdAt: 'asc' } },
      },
    });
  },
};
