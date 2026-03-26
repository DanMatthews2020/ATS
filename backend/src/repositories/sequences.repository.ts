import { prisma } from '../lib/prisma';

export const sequencesRepository = {
  findAll: (createdById: string) =>
    prisma.sequence.findMany({
      where: { createdById },
      include: {
        _count: { select: { steps: true, enrollments: true } },
        steps: { orderBy: { position: 'asc' }, include: { template: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),

  findById: (id: string) =>
    prisma.sequence.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { position: 'asc' }, include: { template: true } },
        _count: { select: { enrollments: true } },
      },
    }),

  create: (data: { name: string; stopOnReply?: boolean; stopOnInterview?: boolean; maxEmails?: number; sendingDays?: string[]; createdById: string }) =>
    prisma.sequence.create({ data, include: { steps: true, _count: { select: { enrollments: true } } } }),

  update: (id: string, data: { name?: string; status?: 'ACTIVE' | 'PAUSED'; stopOnReply?: boolean; stopOnInterview?: boolean; maxEmails?: number; sendingDays?: string[] }) =>
    prisma.sequence.update({ where: { id }, data }),

  delete: (id: string) =>
    prisma.sequence.delete({ where: { id } }),

  addStep: (data: { sequenceId: string; position: number; type: 'EMAIL' | 'WAIT' | 'TASK'; templateId?: string; waitDays?: number; taskDescription?: string; sendTime?: string }) =>
    prisma.sequenceStep.create({ data, include: { template: true } }),

  updateStep: (id: string, data: { position?: number; type?: 'EMAIL' | 'WAIT' | 'TASK'; templateId?: string | null; waitDays?: number; taskDescription?: string; sendTime?: string }) =>
    prisma.sequenceStep.update({ where: { id }, data, include: { template: true } }),

  deleteStep: (id: string) =>
    prisma.sequenceStep.delete({ where: { id } }),

  getEnrollments: (sequenceId: string) =>
    prisma.sequenceEnrollment.findMany({
      where: { sequenceId },
      include: { candidate: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { enrolledAt: 'desc' },
    }),

  enroll: (data: { sequenceId: string; candidateId: string }) =>
    prisma.sequenceEnrollment.create({ data }),

  unenroll: (sequenceId: string, candidateId: string) =>
    prisma.sequenceEnrollment.update({
      where: { sequenceId_candidateId: { sequenceId, candidateId } },
      data: { status: 'STOPPED', stoppedAt: new Date(), stoppedReason: 'Manually unenrolled' },
    }),
};
