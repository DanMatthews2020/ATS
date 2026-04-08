import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { notificationsService, type NotificationType } from '../services/notifications.service';
import { sendSuccess, sendError } from '../utils/response';

export const notificationsController = {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { type } = req.query as { type?: NotificationType };
      const notifications = await notificationsService.getAll(userId, type);
      const unreadCount   = await notificationsService.getUnreadCount(userId);
      sendSuccess(res, { notifications, unreadCount });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      sendSuccess(res, { count: await notificationsService.getUnreadCount(userId) });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async markRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const ok = await notificationsService.markRead(userId, req.params.id);
      if (!ok) { sendError(res, 404, 'NOT_FOUND', 'Notification not found'); return; }
      const unreadCount = await notificationsService.getUnreadCount(userId);
      sendSuccess(res, { read: true, unreadCount });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'UPDATE_ERROR', 'Internal server error');
    }
  },

  async markAllRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const count = await notificationsService.markAllRead(userId);
      sendSuccess(res, { marked: count, unreadCount: 0 });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'UPDATE_ERROR', 'Internal server error');
    }
  },
};
