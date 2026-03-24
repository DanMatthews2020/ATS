import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { interviewsService, type InterviewType } from '../services/interviews.service';
import { sendSuccess, sendError } from '../utils/response';

export const interviewsController = {
  getAll(req: AuthRequest, res: Response): void {
    const { from, to } = req.query as { from?: string; to?: string };
    sendSuccess(res, { interviews: interviewsService.getAll(from, to) });
  },

  getById(req: AuthRequest, res: Response): void {
    const iv = interviewsService.getById(req.params.id);
    if (!iv) { sendError(res, 404, 'NOT_FOUND', 'Interview not found'); return; }
    sendSuccess(res, { interview: iv });
  },

  create(req: AuthRequest, res: Response): void {
    const { candidateId, candidateName, jobId, jobTitle, interviewers, type, scheduledAt, duration, meetingLink, location, notes } = req.body as {
      candidateId: string; candidateName: string;
      jobId: string; jobTitle: string;
      interviewers: { id: string; name: string; role: string }[];
      type: InterviewType; scheduledAt: string; duration: number;
      meetingLink?: string; location?: string; notes?: string;
    };
    if (!candidateId || !candidateName || !jobId || !type || !scheduledAt || !duration) {
      sendError(res, 400, 'INVALID_BODY', 'candidateId, candidateName, jobId, type, scheduledAt, duration are required');
      return;
    }
    const iv = interviewsService.create({ candidateId, candidateName, jobId, jobTitle: jobTitle ?? '', interviewers: interviewers ?? [], type, scheduledAt, duration, meetingLink, location, notes });
    sendSuccess(res, { interview: iv }, 201);
  },

  update(req: AuthRequest, res: Response): void {
    const iv = interviewsService.update(req.params.id, req.body);
    if (!iv) { sendError(res, 404, 'NOT_FOUND', 'Interview not found'); return; }
    sendSuccess(res, { interview: iv });
  },

  cancel(req: AuthRequest, res: Response): void {
    const iv = interviewsService.cancel(req.params.id);
    if (!iv) { sendError(res, 404, 'NOT_FOUND', 'Interview not found'); return; }
    sendSuccess(res, { interview: iv });
  },

  submitFeedback(req: AuthRequest, res: Response): void {
    const { rating, recommendation, notes } = req.body as { rating: number; recommendation: string; notes: string };
    if (!rating || !recommendation) {
      sendError(res, 400, 'INVALID_BODY', 'rating and recommendation are required');
      return;
    }
    const iv = interviewsService.submitFeedback(req.params.id, {
      rating: Number(rating),
      recommendation: recommendation as 'hire' | 'no-hire' | 'maybe',
      notes: notes ?? '',
    });
    if (!iv) { sendError(res, 404, 'NOT_FOUND', 'Interview not found'); return; }
    sendSuccess(res, { interview: iv });
  },
};
