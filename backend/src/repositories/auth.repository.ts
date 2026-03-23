/**
 * @file auth.repository.ts
 * @description Database access layer for authentication.
 *
 * Handles all Prisma queries related to Users and RefreshTokens.
 * The service layer owns business logic; this file owns only data access.
 */
import { prisma } from '../lib/prisma';
import type { User } from '@prisma/client';

export const authRepository = {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await prisma.refreshToken.create({ data: { userId, token, expiresAt } });
  },

  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  },

  async deleteRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.delete({ where: { token } }).catch(() => {
      // Already deleted — ignore
    });
  },

  async deleteAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  },
};
