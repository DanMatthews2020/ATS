import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { interviewsService, type InterviewType, type Recommendation } from '../services/interviews.service';
import { sendSuccess, sendError } from '../utils/response';

export const interviewsController = {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { from, to } = req.query as { from?: string; to?: string };
      const interviews = await interviewsService.getAll(from, to);
      sendSuccess(res, { interviews });
    } catch {
      sendError(res, 500, 'SERVER_ERROR', 'Failed to load interviews');
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const iv = await interviewsService.getById(req.params.id);
      if (!iv) { sendError(res, 404, 'NOT_FOUND', 'Interview not found'); return; }
      sendSuccess(res, { interview: iv });
    } catch {
      sendError(res, 500, 'SERVER_ERROR', 'Failed to load interview');
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        applicationId, candidateId, jobId,
        type, scheduledAt, duration,
        meetingLink, location, notes,
      } = req.body as {
        applicationId?: string; candidateId?: string; jobId?: string;
        type: string; scheduledAt: string; duration: number;
        meetingLink?: string; location?: string; notes?: string;
      };

      if (!type || !scheduledAt || !duration) {
        sendError(res, 400, 'INVALID_BODY', 'type, scheduledAt, duration are required');
        return;
      }
      if (!applicationId && (!candidateId || !jobId)) {
        sendError(res, 400, 'INVALID_BODY', 'Provide applicationId or both candidateId and jobId');
        return;
      }

      const iv = await interviewsService.create({
        applicationId,
        candidateId,
        jobId,
        type:         type as InterviewType,
        scheduledAt,
        duration:     Number(duration),
        meetingLink:  meetingLink  || undefined,
        location:     location    || undefined,
        notes:        notes       || undefined,
      });
      sendSuccess(res, { interview: iv }, 201);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create interview';
      sendError(res, 500, 'SERVER_ERROR', msg);
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const iv = await interviewsService.update(req.params.id, req.body);
      sendSuccess(res, { interview: iv });
    } catch {
      sendError(res, 404, 'NOT_FOUND', 'Interview not found');
    }
  },

  async cancel(req: AuthRequest, res: Response): Promise<void> {
    try {
      const iv = await interviewsService.cancel(req.params.id);
      sendSuccess(res, { interview: iv });
    } catch {
      sendError(res, 404, 'NOT_FOUND', 'Interview not found');
    }
  },

  async submitFeedback(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { rating, recommendation, notes } = req.body as {
        rating: number; recommendation: string; notes: string;
      };
      if (!rating || !recommendation) {
        sendError(res, 400, 'INVALID_BODY', 'rating and recommendation are required');
        return;
      }
      const iv = await interviewsService.submitFeedback(req.params.id, {
        rating:         Number(rating),
        recommendation: recommendation as Recommendation,
        notes:          notes ?? '',
      });
      sendSuccess(res, { interview: iv });
    } catch {
      sendError(res, 404, 'NOT_FOUND', 'Interview not found');
    }
  },
};
