import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { managerDashboardService } from '../services/managerDashboard.service';
import { sendSuccess, sendError } from '../utils/response';

export const managerDashboardController = {
  async getDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const dashboard = await managerDashboardService.getManagerDashboard(userId);
      sendSuccess(res, dashboard);
    } catch {
      sendError(res, 500, 'SERVER_ERROR', 'Failed to load manager dashboard');
    }
  },
};
