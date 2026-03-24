import { prisma } from '../lib/prisma';
import type { ApplicationStatus } from '@prisma/client';

export const applicationsRepository = {
  async findById(id: string) {
    return prisma.application.findUnique({
      where: { id },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true } },
        jobPosting: { select: { id: true, title: true } },
      },
    });
  },

  async updateStage(id: string, status: ApplicationStatus) {
    return prisma.application.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
  },
};
