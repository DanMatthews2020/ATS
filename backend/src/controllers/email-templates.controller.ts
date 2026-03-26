import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { emailTemplatesService } from '../services/email-templates.service';
import { sendSuccess, sendError } from '../utils/response';

export const emailTemplatesController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const templates = await emailTemplatesService.getAll(req.user?.userId);
      sendSuccess(res, { templates });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch email templates');
    }
  },

  async getOne(req: AuthRequest, res: Response): Promise<void> {
    try {
      const template = await emailTemplatesService.getById(req.params.id);
      if (!template) {
        sendError(res, 404, 'NOT_FOUND', 'Email template not found');
        return;
      }
      sendSuccess(res, { template });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch email template');
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, category, subject, body, isShared } = req.body as {
        name: string;
        category: string;
        subject: string;
        body: string;
        isShared: boolean;
      };
      const createdById = req.user!.userId;
      const template = await emailTemplatesService.create({ name, category, subject, body, isShared: isShared ?? false, createdById });
      sendSuccess(res, { template }, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to create email template');
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, category, subject, body, isShared } = req.body as {
        name?: string;
        category?: string;
        subject?: string;
        body?: string;
        isShared?: boolean;
      };
      const template = await emailTemplatesService.update(req.params.id, { name, category, subject, body, isShared });
      sendSuccess(res, { template });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update email template');
    }
  },

  async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      await emailTemplatesService.delete(req.params.id);
      sendSuccess(res, { deleted: true });
    } catch {
      sendError(res, 500, 'DELETE_ERROR', 'Failed to delete email template');
    }
  },
};
