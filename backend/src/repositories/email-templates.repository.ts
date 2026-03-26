import { prisma } from '../lib/prisma';

export const emailTemplatesRepository = {
  findAll: (createdById?: string) =>
    prisma.emailTemplate.findMany({
      where: createdById ? { OR: [{ isShared: true }, { createdById }] } : {},
      orderBy: { updatedAt: 'desc' },
    }),

  findById: (id: string) =>
    prisma.emailTemplate.findUnique({ where: { id } }),

  create: (data: { name: string; category: string; subject: string; body: string; isShared: boolean; createdById: string }) =>
    prisma.emailTemplate.create({ data }),

  update: (id: string, data: { name?: string; category?: string; subject?: string; body?: string; isShared?: boolean }) =>
    prisma.emailTemplate.update({ where: { id }, data }),

  delete: (id: string) =>
    prisma.emailTemplate.delete({ where: { id } }),
};
