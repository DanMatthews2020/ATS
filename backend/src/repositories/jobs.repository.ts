/**
 * @file jobs.repository.ts
 * @description Database access layer for job postings.
 *
 * All queries include `_count.applications` so the service layer can
 * surface applicant counts without a separate query.
 */
import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';

export const jobsRepository = {
  async findMany(params: { skip: number; take: number }) {
    const [items, total] = await Promise.all([
      prisma.jobPosting.findMany({
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { applications: true } },
        },
      }),
      prisma.jobPosting.count(),
    ]);
    return { items, total };
  },

  async findById(id: string) {
    return prisma.jobPosting.findUnique({
      where: { id },
      include: {
        _count: { select: { applications: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        applications: {
          orderBy: { appliedAt: 'desc' },
          select: {
            id: true,
            status: true,
            stage: true,
            appliedAt: true,
            updatedAt: true,
            candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
            _count: { select: { interviews: true } },
            offer: { select: { id: true, status: true } },
          },
        },
      },
    });
  },

  async create(data: Prisma.JobPostingCreateInput) {
    return prisma.jobPosting.create({ data });
  },

  async update(id: string, data: Prisma.JobPostingUpdateInput) {
    return prisma.jobPosting.update({ where: { id }, data });
  },

  async getPipelineStatsByJobId(jobId: string) {
    const rows = await prisma.application.groupBy({
      by: ['status'],
      where: { jobPostingId: jobId },
      _count: { _all: true },
    });
    const map: Record<string, number> = {};
    for (const row of rows) {
      map[row.status] = row._count._all;
    }
    return map;
  },

  async findApplicationsByJobId(jobId: string, status?: string) {
    return prisma.application.findMany({
      where: {
        jobPostingId: jobId,
        ...(status ? { status: status as import('@prisma/client').ApplicationStatus } : {}),
      },
      orderBy: { appliedAt: 'desc' },
      select: {
        id: true,
        status: true,
        stage: true,
        notes: true,
        appliedAt: true,
        updatedAt: true,
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            location: true,
            skills: true,
            cvUrl: true,
            source: true,
          },
        },
        _count: { select: { interviews: true } },
        offer: { select: { id: true, status: true } },
        interviews: { select: { rating: true, status: true } },
      },
    });
  },

  async getPipelineStats() {
    const rows = await prisma.application.groupBy({
      by: ['jobPostingId', 'status'],
      _count: { _all: true },
    });
    const map: Record<string, Record<string, number>> = {};
    for (const row of rows) {
      if (!map[row.jobPostingId]) map[row.jobPostingId] = {};
      map[row.jobPostingId][row.status] = row._count._all;
    }
    return map;
  },

  async getStats() {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const [openPositions, totalApplicants, interviewsThisWeek, offersExtended] = await Promise.all([
      prisma.jobPosting.count({ where: { status: 'OPEN' } }),
      prisma.application.count(),
      prisma.interview.count({
        where: { scheduledAt: { gte: startOfWeek, lt: endOfWeek } },
      }),
      prisma.offer.count({ where: { status: { not: 'DRAFT' } } }),
    ]);

    return { openPositions, totalApplicants, interviewsThisWeek, offersExtended };
  },
};
