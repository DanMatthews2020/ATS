/**
 * @file candidates.repository.ts
 * @description Database access layer for candidates and their applications.
 */
import { prisma } from '../lib/prisma';
import type { ApplicationStatus, Prisma } from '@prisma/client';

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
    const where: Prisma.CandidateWhereInput = params.search
      ? {
          OR: [
            { firstName: { contains: params.search, mode: 'insensitive' } },
            { lastName:  { contains: params.search, mode: 'insensitive' } },
            { email:     { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {};

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
};
