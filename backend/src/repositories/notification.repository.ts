/**
 * @file notification.repository.ts
 * @description Notification persistence — CRUD for per-user notifications.
 */
import { prisma } from '../lib/prisma';

export interface NotificationCreateData {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  entityType?: string;
  entityId?: string;
}

export const notificationRepository = {
  async findUnreadByUser(userId: string) {
    return prisma.notification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(data: NotificationCreateData) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        link: data.link,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    });
  },

  async markRead(notificationId: string, userId: string) {
    const notif = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notif) return false;
    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
    return true;
  },

  async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return result.count;
  },

  async countUnread(userId: string) {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  },
};
