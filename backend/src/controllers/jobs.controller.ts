import type { Request, Response } from 'express';
import { jobsService } from '../services/jobs.service';
import { sendSuccess, sendError } from '../utils/response';

export const jobsController = {
  async getJobs(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
      const result = await jobsService.getJobs(page, limit);
      sendSuccess(res, result);
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch job postings');
    }
  },
};
