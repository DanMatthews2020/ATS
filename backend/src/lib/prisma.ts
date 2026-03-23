/**
 * @file prisma.ts
 * @description Singleton PrismaClient instance.
 *
 * In development, the instance is attached to `global` so that hot-module
 * reloads (tsx watch) don't create a new connection pool on every file save.
 * In production, a fresh instance is created once and reused for the
 * lifetime of the process.
 */
import { PrismaClient } from '@prisma/client';

declare global {
  // Allow global `var` for singleton in development
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
