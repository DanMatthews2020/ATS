/**
 * @file sequences.repository.ts
 * @description Prisma queries for sequences, steps, and enrollments.
 */
import { prisma } from '../lib/prisma';
import type { EnrollmentStatus } from '@prisma/client';

// Reused across enrollment queries
const CANDIDATE_SELECT = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    currentCompany: true,
  },
} as const;

export const sequencesRepository = {
  // ─── Sequences ──────────────────────────────────────────────────────────────

  findAll: (opts: { search?: string; status?: string }) =>
    prisma.sequence.findMany({
      where: {
        ...(opts.status ? { status: opts.status as 'ACTIVE' | 'PAUSED' } : {}),
        ...(opts.search
          ? { name: { contains: opts.search, mode: 'insensitive' } }
          : {}),
      },
      include: {
        _count: { select: { steps: true, enrollments: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),

  findById: (id: string) =>
    prisma.sequence.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { position: 'asc' },
          include: { template: { select: { id: true, name: true } } },
        },
        _count: { select: { enrollments: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),

  create: (data: {
    name: string;
    senderEmail?: string;
    linkedJobId?: string;
    stopOnReply?: boolean;
    stopOnInterview?: boolean;
    stopOnHired?: boolean;
    skipWeekends?: boolean;
    isShared?: boolean;
    maxEmails?: number;
    sendingDays?: string[];
    createdById: string;
  }) =>
    prisma.sequence.create({
      data,
      include: {
        steps: { orderBy: { position: 'asc' } },
        _count: { select: { enrollments: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),

  update: (
    id: string,
    data: {
      name?: string;
      status?: 'ACTIVE' | 'PAUSED';
      senderEmail?: string;
      linkedJobId?: string;
      stopOnReply?: boolean;
      stopOnInterview?: boolean;
      stopOnHired?: boolean;
      skipWeekends?: boolean;
      isShared?: boolean;
      maxEmails?: number;
      sendingDays?: string[];
    },
  ) =>
    prisma.sequence.update({
      where: { id },
      data,
      include: {
        _count: { select: { steps: true, enrollments: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),

  delete: (id: string) => prisma.sequence.delete({ where: { id } }),

  // ─── Steps ──────────────────────────────────────────────────────────────────

  addStep: (data: {
    sequenceId: string;
    position: number;
    type: 'EMAIL' | 'WAIT' | 'TASK';
    subject?: string;
    body?: string;
    templateId?: string;
    waitDays?: number;
    delayDays?: number;
    taskDescription?: string;
    sendTime?: string;
    sendFrom?: string;
  }) =>
    prisma.sequenceStep.create({
      data,
      include: { template: { select: { id: true, name: true } } },
    }),

  updateStep: (
    id: string,
    data: {
      position?: number;
      type?: 'EMAIL' | 'WAIT' | 'TASK';
      subject?: string;
      body?: string;
      templateId?: string | null;
      waitDays?: number;
      delayDays?: number;
      taskDescription?: string;
      sendTime?: string;
      sendFrom?: string;
    },
  ) =>
    prisma.sequenceStep.update({
      where: { id },
      data,
      include: { template: { select: { id: true, name: true } } },
    }),

  deleteStep: (id: string) => prisma.sequenceStep.delete({ where: { id } }),

  // ─── Enrollments ────────────────────────────────────────────────────────────

  getEnrollments: (sequenceId: string, opts: { status?: string } = {}) =>
    prisma.sequenceEnrollment.findMany({
      where: {
        sequenceId,
        ...(opts.status ? { status: opts.status as EnrollmentStatus } : {}),
      },
      include: { candidate: CANDIDATE_SELECT },
      orderBy: { enrolledAt: 'desc' },
    }),

  findEnrollment: (sequenceId: string, candidateId: string) =>
    prisma.sequenceEnrollment.findUnique({
      where: { sequenceId_candidateId: { sequenceId, candidateId } },
    }),

  enroll: (data: {
    sequenceId: string;
    candidateId: string;
    sendFrom?: string;
    startDate?: Date;
  }) =>
    prisma.sequenceEnrollment.create({
      data: { ...data, status: 'ENROLLED' },
      include: { candidate: CANDIDATE_SELECT },
    }),

  unenroll: (sequenceId: string, candidateId: string) =>
    prisma.sequenceEnrollment.update({
      where: { sequenceId_candidateId: { sequenceId, candidateId } },
      data: {
        status: 'STOPPED',
        stoppedAt: new Date(),
        stoppedReason: 'Manually unenrolled',
      },
    }),

  updateEnrollmentResponse: (enrollmentId: string, response: string) =>
    prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { response, status: 'REPLIED' },
      include: { candidate: CANDIDATE_SELECT },
    }),

  // Single groupBy query instead of 6 separate count calls
  getStats: async (sequenceId: string) => {
    const groups = await prisma.sequenceEnrollment.groupBy({
      by: ['status'],
      where: { sequenceId },
      _count: { _all: true },
      _sum: { opens: true, clicks: true },
    });
    const byStatus = new Map(groups.map((g) => [g.status as string, g]));
    const sum = (statuses: string[]) =>
      statuses.reduce((acc, s) => acc + (byStatus.get(s)?._count._all ?? 0), 0);
    return {
      total: groups.reduce((acc, g) => acc + g._count._all, 0),
      active: sum(['ACTIVE', 'ENROLLED', 'IN_PROGRESS']),
      completed: sum(['COMPLETED']),
      stopped: sum(['STOPPED']),
      replied: sum(['REPLIED', 'INTERESTED', 'CONVERTED']),
      opens: groups.reduce((acc, g) => acc + (g._sum.opens ?? 0), 0),
      clicks: groups.reduce((acc, g) => acc + (g._sum.clicks ?? 0), 0),
    };
  },

  // Get all sequence enrollments for a candidate (across all sequences)
  findEnrollmentsByCandidate: (candidateId: string) =>
    prisma.sequenceEnrollment.findMany({
      where: { candidateId },
      include: { sequence: { select: { id: true, name: true } } },
      orderBy: { enrolledAt: 'desc' },
    }),
};
