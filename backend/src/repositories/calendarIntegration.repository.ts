/**
 * @file calendarIntegration.repository.ts
 * @description Database access layer for calendar integrations.
 *
 * Tokens (accessToken, refreshToken) are stored encrypted. This repository
 * returns them as-is (encrypted) — the service layer handles decryption.
 * Status queries strip tokens before returning.
 */
import { prisma } from '../lib/prisma';
import type { CalendarProvider } from '@prisma/client';

export interface CalendarIntegrationUpsertData {
  provider: CalendarProvider;
  accessToken: string;   // already encrypted
  refreshToken: string;  // already encrypted
  tokenExpiry: Date;
  calendarId: string;
  isActive: boolean;
}

export const calendarIntegrationRepository = {
  /** Full record including encrypted tokens — for service-layer use only. */
  async findByUserId(userId: string) {
    return prisma.calendarIntegration.findUnique({
      where: { userId },
    });
  },

  async findById(id: string) {
    return prisma.calendarIntegration.findUnique({
      where: { id },
    });
  },

  /** Safe projection — no tokens. For status checks and API responses. */
  async findStatusByUserId(userId: string) {
    return prisma.calendarIntegration.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        provider: true,
        calendarId: true,
        isActive: true,
        tokenExpiry: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async upsert(userId: string, data: CalendarIntegrationUpsertData) {
    return prisma.calendarIntegration.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },

  async updateTokens(userId: string, data: {
    accessToken: string;
    refreshToken: string;
    tokenExpiry: Date;
  }) {
    return prisma.calendarIntegration.update({
      where: { userId },
      data,
    });
  },

  async deactivate(userId: string) {
    await prisma.calendarIntegration.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  },
};
