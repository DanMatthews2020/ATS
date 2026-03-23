import type { Request, Response } from 'express';
import { candidatesService } from '../services/candidates.service';
import { sendSuccess, sendError } from '../utils/response';
import type { ApplicationStatus } from '@prisma/client';

const VALID_STATUSES = new Set<string>([
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'HIRED',
  'REJECTED',
]);

export const candidatesController = {
  async getTracking(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
      const rawStatus = (req.query.status as string | undefined)?.toUpperCase();
      const status = rawStatus && VALID_STATUSES.has(rawStatus)
        ? (rawStatus as ApplicationStatus)
        : undefined;
      const jobId = req.query.jobId as string | undefined;

      const result = await candidatesService.getTracking(page, limit, status, jobId);
      sendSuccess(res, result);
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch candidate tracking');
    }
  },
};
