import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { onboardingService } from '../services/onboarding.service';
import { sendSuccess, sendError } from '../utils/response';

export const onboardingController = {
  /** GET /api/onboarding */
  getSession(req: AuthRequest, res: Response): void {
    const userId = req.user!.userId;
    const session = onboardingService.getSession(userId);
    sendSuccess(res, { session });
  },

  /** POST /api/onboarding/step/1 — save profile */
  saveProfile(req: AuthRequest, res: Response): void {
    try {
      const userId = req.user!.userId;
      const profile = req.body as Parameters<typeof onboardingService.saveProfile>[1];
      if (!profile?.fullName) {
        sendError(res, 400, 'INVALID_BODY', 'fullName is required');
        return;
      }
      const session = onboardingService.saveProfile(userId, profile);
      sendSuccess(res, { session });
    } catch {
      sendError(res, 500, 'SAVE_ERROR', 'Failed to save profile');
    }
  },

  /** POST /api/onboarding/step/2 — mark tasks step done */
  advanceToStep3(req: AuthRequest, res: Response): void {
    const userId = req.user!.userId;
    const session = onboardingService.advanceToStep3(userId);
    sendSuccess(res, { session });
  },

  /** PATCH /api/onboarding/skip */
  skipStep(req: AuthRequest, res: Response): void {
    const userId = req.user!.userId;
    const session = onboardingService.skipStep(userId);
    sendSuccess(res, { session });
  },

  /** PATCH /api/onboarding/tasks/:taskId */
  updateTask(req: AuthRequest, res: Response): void {
    try {
      const userId = req.user!.userId;
      const { taskId } = req.params;
      const { checked } = req.body as { checked: boolean };
      if (typeof checked !== 'boolean') {
        sendError(res, 400, 'INVALID_BODY', 'checked must be a boolean');
        return;
      }
      const result = onboardingService.updateTask(userId, taskId, checked);
      sendSuccess(res, result);
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update task');
    }
  },

  /** POST /api/onboarding/upload — multipart file upload */
  uploadDocument(req: AuthRequest, res: Response): void {
    try {
      const userId = req.user!.userId;
      const { type } = req.body as { type: 'resume' | 'id' };
      if (type !== 'resume' && type !== 'id') {
        sendError(res, 400, 'INVALID_BODY', 'type must be "resume" or "id"');
        return;
      }
      if (!req.file) {
        sendError(res, 400, 'NO_FILE', 'No file uploaded');
        return;
      }
      const doc = onboardingService.uploadDocument(userId, type, req.file.originalname);
      sendSuccess(res, { document: doc });
    } catch {
      sendError(res, 500, 'UPLOAD_ERROR', 'Failed to process upload');
    }
  },

  /** POST /api/onboarding/complete */
  complete(req: AuthRequest, res: Response): void {
    const userId = req.user!.userId;
    const session = onboardingService.complete(userId);
    sendSuccess(res, { session });
  },

  /** POST /api/onboarding/assistance */
  requestAssistance(req: AuthRequest, res: Response): void {
    try {
      const userId = req.user!.userId;
      const { message } = req.body as { message: string };
      if (typeof message !== 'string' || !message.trim()) {
        sendError(res, 400, 'INVALID_BODY', 'message is required');
        return;
      }
      const result = onboardingService.requestAssistance(userId, message);
      sendSuccess(res, result);
    } catch {
      sendError(res, 500, 'ASSIST_ERROR', 'Failed to send assistance request');
    }
  },

  /** GET /api/onboarding/activity */
  getActivity(req: AuthRequest, res: Response): void {
    const userId = req.user!.userId;
    const activity = onboardingService.getActivity(userId);
    sendSuccess(res, { activity });
  },
};
