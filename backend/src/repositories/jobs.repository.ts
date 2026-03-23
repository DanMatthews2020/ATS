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
      },
    });
  },

  async create(data: Prisma.JobPostingCreateInput) {
    return prisma.jobPosting.create({ data });
  },

  async update(id: string, data: Prisma.JobPostingUpdateInput) {
    return prisma.jobPosting.update({ where: { id }, data });
  },
};
