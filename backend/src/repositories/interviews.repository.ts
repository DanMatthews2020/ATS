import { prisma } from '../lib/prisma';
import type { InterviewType, InterviewStatus } from '@prisma/client';

const INCLUDE = {
  application: {
    include: {
      candidate: { select: { id: true, firstName: true, lastName: true } },
      jobPosting: { select: { id: true, title: true } },
    },
  },
  interviewers: {
    include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
  },
  calendarMapping: { select: { externalEventId: true } },
} as const;

export const interviewsRepository = {
  async findAll(from?: string, to?: string) {
    return prisma.interview.findMany({
      where: {
        ...(from || to ? {
          scheduledAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to   ? { lte: new Date(to)   } : {}),
          },
        } : {}),
      },
      include: INCLUDE,
      orderBy: { scheduledAt: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.interview.findUnique({ where: { id }, include: INCLUDE });
  },

  async create(data: {
    applicationId?: string;
    candidateId?: string;
    jobId?: string;
    type: InterviewType;
    scheduledAt: Date;
    duration: number;
    meetingLink?: string | null;
    location?: string | null;
    notes?: string;
  }) {
    let applicationId = data.applicationId;

    if (!applicationId) {
      if (!data.candidateId || !data.jobId) {
        throw new Error('Either applicationId or both candidateId and jobId are required');
      }
      const existing = await prisma.application.findUnique({
        where: { candidateId_jobPostingId: { candidateId: data.candidateId, jobPostingId: data.jobId } },
      });
      applicationId = existing
        ? existing.id
        : (await prisma.application.create({
            data: { candidateId: data.candidateId, jobPostingId: data.jobId, status: 'APPLIED' },
          })).id;
    }

    return prisma.interview.create({
      data: {
        applicationId,
        type:        data.type,
        scheduledAt: data.scheduledAt,
        duration:    data.duration,
        meetingLink: data.meetingLink ?? null,
        location:    data.location ?? null,
        notes:       data.notes,
        status:      'SCHEDULED',
      },
      include: INCLUDE,
    });
  },

  async update(id: string, data: Partial<{
    scheduledAt:    Date;
    duration:       number;
    status:         InterviewStatus;
    meetingLink:    string | null;
    location:       string | null;
    notes:          string;
    type:           InterviewType;
    feedback:       string;
    rating:         number;
    recommendation: string;
  }>) {
    return prisma.interview.update({ where: { id }, data, include: INCLUDE });
  },

  async cancel(id: string) {
    return prisma.interview.update({
      where: { id },
      data:  { status: 'CANCELLED', updatedAt: new Date() },
      include: INCLUDE,
    });
  },

  async submitFeedback(id: string, data: { rating: number; recommendation: string; notes: string }) {
    return prisma.interview.update({
      where: { id },
      data: {
        rating:         data.rating,
        feedback:       data.notes,
        recommendation: data.recommendation,
        status:         'COMPLETED',
        updatedAt:      new Date(),
      },
      include: INCLUDE,
    });
  },
};
