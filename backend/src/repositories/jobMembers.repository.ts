import { prisma } from '../lib/prisma';

const USER_SELECT = {
  id: true, firstName: true, lastName: true, email: true, avatarUrl: true,
} as const;

export const jobMembersRepository = {
  async findByJobId(jobId: string) {
    return prisma.jobMember.findMany({
      where: { jobId },
      include: { user: { select: USER_SELECT } },
      orderBy: { addedAt: 'asc' },
    });
  },

  async add(jobId: string, userId: string, role: string) {
    return prisma.jobMember.create({
      data: { jobId, userId, role },
      include: { user: { select: USER_SELECT } },
    });
  },

  async removeById(id: string) {
    return prisma.jobMember.delete({ where: { id } });
  },

  async findById(id: string) {
    return prisma.jobMember.findUnique({ where: { id } });
  },
};
