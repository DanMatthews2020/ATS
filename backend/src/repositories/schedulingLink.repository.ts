/**
 * @file schedulingLink.repository.ts
 * @description Database access layer for scheduling links and slots.
 */
import { prisma } from '../lib/prisma';

const INCLUDE = {
  application: {
    include: {
      candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
      jobPosting: { select: { id: true, title: true } },
    },
  },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  slots: { orderBy: { startTime: 'asc' as const } },
} as const;

export const schedulingLinkRepository = {
  async create(data: {
    applicationId: string;
    interviewStageId?: string;
    token: string;
    durationMinutes: number;
    bufferBefore?: number;
    bufferAfter?: number;
    expiresAt: Date;
    timezone: string;
    createdById: string;
  }) {
    return prisma.schedulingLink.create({
      data: {
        applicationId: data.applicationId,
        interviewStageId: data.interviewStageId ?? null,
        token: data.token,
        durationMinutes: data.durationMinutes,
        bufferBefore: data.bufferBefore ?? 0,
        bufferAfter: data.bufferAfter ?? 0,
        expiresAt: data.expiresAt,
        timezone: data.timezone,
        createdById: data.createdById,
      },
      include: INCLUDE,
    });
  },

  async findByToken(token: string) {
    return prisma.schedulingLink.findUnique({
      where: { token },
      include: INCLUDE,
    });
  },

  async findByApplicationId(applicationId: string) {
    return prisma.schedulingLink.findMany({
      where: { applicationId },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  },

  async markAsUsed(id: string) {
    return prisma.schedulingLink.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },

  async createSlots(schedulingLinkId: string, slots: { startTime: Date; endTime: Date }[]) {
    return prisma.schedulingLinkSlot.createMany({
      data: slots.map((s) => ({
        schedulingLinkId,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    });
  },

  async markSlotBooked(slotId: string) {
    return prisma.schedulingLinkSlot.update({
      where: { id: slotId },
      data: { isBooked: true },
    });
  },

  async findSlotById(slotId: string) {
    return prisma.schedulingLinkSlot.findUnique({
      where: { id: slotId },
      include: { schedulingLink: { include: INCLUDE } },
    });
  },
};
