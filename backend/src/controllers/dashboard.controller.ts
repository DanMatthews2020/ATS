import type { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { sendSuccess, sendError } from '../utils/response';

export const dashboardController = {
  async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await dashboardService.getStats();
      sendSuccess(res, stats);
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch dashboard stats');
    }
  },
};
