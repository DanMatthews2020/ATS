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

  async updateSubStage(id: string, stage: string | null) {
    return prisma.application.update({
      where: { id },
      data: { stage: stage ?? null, updatedAt: new Date() },
    });
  },

  async updateNotes(id: string, notes: string) {
    return prisma.application.update({
      where: { id },
      data: { notes, updatedAt: new Date() },
    });
  },

  async create(data: { candidateId: string; jobPostingId: string; status?: ApplicationStatus }) {
    return prisma.application.create({
      data: {
        candidateId:  data.candidateId,
        jobPostingId: data.jobPostingId,
        status:       data.status ?? 'APPLIED',
      },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true, skills: true } },
      },
    });
  },
};
