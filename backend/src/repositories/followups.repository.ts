import { prisma } from '../lib/prisma';

export const followUpsRepository = {
  findByCandidateId: (candidateId: string) =>
    prisma.followUp.findMany({
      where: { candidateId },
      orderBy: { followUpDate: 'asc' },
    }),

  findById: (id: string) =>
    prisma.followUp.findUnique({ where: { id } }),

  create: (data: { candidateId: string; followUpDate: Date; note?: string; createdById: string }) =>
    prisma.followUp.create({ data }),

  update: (id: string, data: { followUpDate?: Date; note?: string; isCompleted?: boolean }) =>
    prisma.followUp.update({ where: { id }, data }),

  delete: (id: string) =>
    prisma.followUp.delete({ where: { id } }),
};
