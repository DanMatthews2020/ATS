/**
 * @file integrations.controller.ts
 * @description Single endpoint returning combined integration status for all
 * Google Workspace features (workspace, calendar, gmail).
 */
import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { googleWorkspaceService } from '../services/googleWorkspace.service';
import { calendarIntegrationService } from '../services/calendarIntegration.service';
import { gmailService } from '../services/gmail.service';
import { sendSuccess, sendError } from '../utils/response';

export const integrationsController = {
  /** GET /api/integrations/status */
  async getStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
        return;
      }

      const [workspace, calendar, gmail] = await Promise.all([
        googleWorkspaceService.getConnectionStatus(userId),
        calendarIntegrationService.getCalendarStatus(userId),
        gmailService.getGmailStatus(userId),
      ]);

      sendSuccess(res, { workspace, calendar, gmail });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch integration status');
    }
  },
};
