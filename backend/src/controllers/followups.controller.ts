import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { followUpsService } from '../services/followups.service';
import { sendSuccess, sendError } from '../utils/response';

export const followUpsController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const candidateId = req.query.candidateId as string;
      if (!candidateId) {
        sendError(res, 400, 'MISSING_PARAM', 'candidateId query param is required');
        return;
      }
      const followUps = await followUpsService.getByCandidateId(candidateId);
      sendSuccess(res, { followUps });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch follow-ups');
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { candidateId, followUpDate, note } = req.body as {
        candidateId: string;
        followUpDate: string;
        note?: string;
      };
      if (!candidateId || !followUpDate) {
        sendError(res, 400, 'INVALID_BODY', 'candidateId and followUpDate are required');
        return;
      }
      const createdById = req.user!.userId;
      const followUp = await followUpsService.create({ candidateId, followUpDate, note, createdById });
      sendSuccess(res, { followUp }, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to create follow-up');
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { followUpDate, note, isCompleted } = req.body as {
        followUpDate?: string;
        note?: string;
        isCompleted?: boolean;
      };
      const followUp = await followUpsService.update(req.params.id, { followUpDate, note, isCompleted });
      sendSuccess(res, { followUp });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update follow-up');
    }
  },

  async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      await followUpsService.delete(req.params.id);
      sendSuccess(res, { deleted: true });
    } catch {
      sendError(res, 500, 'DELETE_ERROR', 'Failed to delete follow-up');
    }
  },
};
