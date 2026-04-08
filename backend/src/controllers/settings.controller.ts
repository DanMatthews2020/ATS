import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { settingsService, type NotifKey } from '../services/settings.service';
import { sendSuccess, sendError } from '../utils/response';

export const settingsController = {

  // ── Profile (GET + PATCH /settings/profile) ─────────────────────────────

  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated'); return; }
    try {
      const profile = await settingsService.getProfile(req.user.userId);
      sendSuccess(res, { profile });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated'); return; }
    try {
      const { firstName, lastName, email, timezone, language, avatarUrl } = req.body as {
        firstName?: string; lastName?: string; email?: string;
        timezone?: string; language?: string; avatarUrl?: string | null;
      };
      const profile = await settingsService.updateProfile(req.user.userId, {
        ...(firstName  !== undefined && { firstName }),
        ...(lastName   !== undefined && { lastName }),
        ...(email      !== undefined && { email }),
        ...(timezone   !== undefined && { timezone }),
        ...(language   !== undefined && { language }),
        ...(avatarUrl  !== undefined && { avatarUrl }),
      });
      sendSuccess(res, { profile });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'UPDATE_ERROR', 'Internal server error');
    }
  },

  // ── Integrations ─────────────────────────────────────────────────────────

  getIntegrations(_req: AuthRequest, res: Response): void {
    sendSuccess(res, { integrations: settingsService.getIntegrations() });
  },

  toggleIntegration(req: AuthRequest, res: Response): void {
    const { key } = req.params;
    const result = settingsService.toggleIntegration(key);
    if (!result) { sendError(res, 404, 'NOT_FOUND', 'Integration not found'); return; }
    sendSuccess(res, { integration: result });
  },

  // ── Notifications ─────────────────────────────────────────────────────────

  getNotifications(_req: AuthRequest, res: Response): void {
    sendSuccess(res, { notifications: settingsService.getNotifications() });
  },

  updateNotifications(req: AuthRequest, res: Response): void {
    const { email, inApp } = req.body as {
      email?: Partial<Record<NotifKey, boolean>>;
      inApp?: Partial<Record<NotifKey, boolean>>;
    };
    const updated = settingsService.updateNotifications({ email, inApp });
    sendSuccess(res, { notifications: updated });
  },

  // ── Billing ────────────────────────────────────────────────────────────────

  getBilling(_req: AuthRequest, res: Response): void {
    sendSuccess(res, { billing: settingsService.getBilling() });
  },

  // ── Security ───────────────────────────────────────────────────────────────

  getSecuritySettings(_req: AuthRequest, res: Response): void {
    sendSuccess(res, {
      security:     settingsService.getSecuritySettings(),
      sessions:     settingsService.getSessions(),
      loginHistory: settingsService.getLoginHistory(),
    });
  },

  updateSecuritySettings(req: AuthRequest, res: Response): void {
    const { twoFactorEnabled } = req.body as { twoFactorEnabled?: boolean };
    const updated = settingsService.updateSecuritySettings({ twoFactorEnabled });
    sendSuccess(res, { security: updated });
  },

  revokeSession(req: AuthRequest, res: Response): void {
    const { id } = req.params;
    const ok = settingsService.revokeSession(id);
    if (!ok) { sendError(res, 400, 'CANNOT_REVOKE', 'Session not found or is the current session'); return; }
    sendSuccess(res, { revoked: true });
  },
};
