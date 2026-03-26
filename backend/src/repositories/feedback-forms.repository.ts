import { prisma } from '../lib/prisma';

export const feedbackFormsRepository = {
  findAll: () =>
    prisma.feedbackForm.findMany({
      include: { _count: { select: { submissions: true } } },
      orderBy: { updatedAt: 'desc' },
    }),

  findById: (id: string) =>
    prisma.feedbackForm.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } },
    }),

  create: (data: { name: string; stage?: string; questions: unknown; createdById: string }) =>
    prisma.feedbackForm.create({ data: data as any }),

  update: (id: string, data: { name?: string; stage?: string; questions?: unknown }) =>
    prisma.feedbackForm.update({ where: { id }, data: data as any }),

  delete: (id: string) =>
    prisma.feedbackForm.delete({ where: { id } }),

  getSubmissions: (formId: string) =>
    prisma.feedbackSubmission.findMany({
      where: { formId },
      include: {
        candidate: { select: { firstName: true, lastName: true, email: true } },
        submittedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { submittedAt: 'desc' },
    }),

  createSubmission: (data: { formId: string; candidateId: string; applicationId?: string; submittedById: string; answers: unknown; overallRating?: number; recommendation?: string }) =>
    prisma.feedbackSubmission.create({ data: data as any }),
};
