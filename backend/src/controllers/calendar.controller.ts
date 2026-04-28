/**
 * @file calendar.controller.ts
 * @description Google Calendar OAuth endpoints.
 *
 * All responses use sendSuccess() / sendError() — no raw res.json().
 * The callback endpoint is unauthenticated (OAuth redirect from Google).
 */
import type { Request, Response } from 'express';
import type { AuthRequest } from '../types';
import { calendarIntegrationService } from '../services/calendarIntegration.service';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';

// ─── Zod schemas ────────────────────────────────────────────────────────────

export const FreeBusySchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(20),
  timeMin: z.string().datetime(),
  timeMax: z.string().datetime(),
});

// ─── Controller ─────────────────────────────────────────────────────────────

export const calendarController = {
  /** GET /api/calendar/auth-url — generate Google OAuth URL */
  async getAuthUrl(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) { sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'); return; }
      const url = calendarIntegrationService.generateGoogleAuthUrl(userId);
      sendSuccess(res, { url });
    } catch {
      sendError(res, 500, 'AUTH_URL_ERROR', 'Failed to generate Google auth URL');
    }
  },

  /** GET /api/calendar/callback — Google OAuth redirect (no auth) */
  async handleCallback(req: Request, res: Response): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const redirectBase = `${frontendUrl}/settings/calendar`;

    try {
      const { code, state, error } = req.query as Record<string, string | undefined>;

      if (error) {
        res.redirect(`${redirectBase}?error=${encodeURIComponent(error)}`);
        return;
      }

      if (!code || !state) {
        res.redirect(`${redirectBase}?error=missing_params`);
        return;
      }

      await calendarIntegrationService.handleGoogleCallback(code, state);
      res.redirect(`${redirectBase}?connected=true`);
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code ?? 'callback_failed';
      res.redirect(`${redirectBase}?error=${encodeURIComponent(errCode)}`);
    }
  },

  /** GET /api/calendar/status — check connection status */
  async getStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) { sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'); return; }
      const status = await calendarIntegrationService.getCalendarStatus(userId);
      sendSuccess(res, status);
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch calendar status');
    }
  },

  /** DELETE /api/calendar/disconnect — revoke and deactivate */
  async disconnect(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) { sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'); return; }
      await calendarIntegrationService.disconnectCalendar(userId);
      sendSuccess(res, { disconnected: true });
    } catch {
      sendError(res, 500, 'DISCONNECT_ERROR', 'Failed to disconnect calendar');
    }
  },

  /** POST /api/calendar/free-busy — query free/busy for users */
  async getFreeBusy(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) { sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'); return; }

      const parsed = FreeBusySchema.safeParse(req.body);
      if (!parsed.success) {
        const details = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
        sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', details);
        return;
      }

      const { userIds, timeMin, timeMax } = parsed.data;
      const busyMap = await calendarIntegrationService.getFreeBusy(
        userIds,
        new Date(timeMin),
        new Date(timeMax),
      );
      sendSuccess(res, { freeBusy: busyMap });
    } catch {
      sendError(res, 500, 'FREEBUSY_ERROR', 'Failed to fetch free/busy data');
    }
  },
};
