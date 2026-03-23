import { prisma } from '../lib/prisma';
import type { ApplicationStatus } from '@prisma/client';

export const candidatesRepository = {
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
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
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
};
