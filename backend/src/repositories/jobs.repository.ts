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
