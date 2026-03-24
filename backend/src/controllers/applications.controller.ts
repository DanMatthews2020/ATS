import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { applicationsService } from '../services/applications.service';
import { sendSuccess, sendError } from '../utils/response';
import type { ApplicationStatus } from '@prisma/client';

export const applicationsController = {
  async updateStage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.body as { status: ApplicationStatus };
      const result = await applicationsService.updateStage(req.params.id, status);
      if (!result) {
        sendError(res, 404, 'NOT_FOUND', 'Application not found');
        return;
      }
      sendSuccess(res, result);
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update application stage');
    }
  },

  async updateNotes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { notes } = req.body as { notes: string };
      if (typeof notes !== 'string') {
        sendError(res, 400, 'INVALID_BODY', 'notes must be a string');
        return;
      }
      const result = await applicationsService.updateNotes(req.params.id, notes);
      if (!result) {
        sendError(res, 404, 'NOT_FOUND', 'Application not found');
        return;
      }
      sendSuccess(res, result);
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update notes');
    }
  },
};
