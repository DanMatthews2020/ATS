import { prisma } from '../lib/prisma';

export const referralsRepository = {
  async create(data: {
    candidateId: string;
    referredByName: string;
    referredByEmail?: string;
    relationship: string;
    jobId?: string;
    jobTitle?: string;
    note?: string;
    referralDate: Date;
  }) {
    return prisma.referral.create({ data });
  },

  async findByCandidateId(candidateId: string) {
    return prisma.referral.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async deleteById(id: string) {
    return prisma.referral.delete({ where: { id } });
  },
};
