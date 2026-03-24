import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { notificationsService, type NotificationType } from '../services/notifications.service';
import { sendSuccess, sendError } from '../utils/response';

export const notificationsController = {
  getAll(req: AuthRequest, res: Response): void {
    const { type } = req.query as { type?: NotificationType };
    const notifications = notificationsService.getAll(type);
    const unreadCount   = notificationsService.getUnreadCount();
    sendSuccess(res, { notifications, unreadCount });
  },

  getUnreadCount(_req: AuthRequest, res: Response): void {
    sendSuccess(res, { count: notificationsService.getUnreadCount() });
  },

  markRead(req: AuthRequest, res: Response): void {
    const ok = notificationsService.markRead(req.params.id);
    if (!ok) { sendError(res, 404, 'NOT_FOUND', 'Notification not found'); return; }
    sendSuccess(res, { read: true, unreadCount: notificationsService.getUnreadCount() });
  },

  markAllRead(_req: AuthRequest, res: Response): void {
    const count = notificationsService.markAllRead();
    sendSuccess(res, { marked: count, unreadCount: 0 });
  },
};
