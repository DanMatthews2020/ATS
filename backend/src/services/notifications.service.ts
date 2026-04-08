/**
 * @file notifications.service.ts
 * @description Notifications backed by Prisma Notification model.
 */

import { prisma } from '../lib/prisma';

export type NotificationType = 'interview' | 'offer' | 'application' | 'task' | 'review';

export interface Notification {
  id:        string;
  type:      NotificationType;
  title:     string;
  message:   string;
  read:      boolean;
  href:      string;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDto(row: any): Notification {
  return {
    id:        row.id,
    type:      row.type as NotificationType,
    title:     row.title,
    message:   row.body,
    read:      row.read,
    href:      row.link ?? '',
    createdAt: row.createdAt.toISOString(),
  };
}

export const notificationsService = {
  async getAll(userId: string, type?: NotificationType): Promise<Notification[]> {
    const where: Record<string, unknown> = { userId };
    if (type) where.type = type;
    const rows = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDto);
  },

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  },

  async markRead(userId: string, id: string): Promise<boolean> {
    const notif = await prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notif) return false;
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return true;
  },

  async markAllRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return result.count;
  },

  async push(userId: string, data: { type: NotificationType; title: string; message: string; href: string }): Promise<Notification> {
    const row = await prisma.notification.create({
      data: {
        userId,
        type:  data.type,
        title: data.title,
        body:  data.message,
        link:  data.href,
      },
    });
    return toDto(row);
  },
};
