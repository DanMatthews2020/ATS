/**
 * @file googleAuth.controller.ts
 * @description HTTP handlers for Google SSO authentication.
 *
 * Routes:
 *  GET  /api/auth/google/url      — returns the OAuth consent URL
 *  GET  /api/auth/google/callback  — handles the OAuth redirect
 *  GET  /api/auth/google/status    — checks if Google SSO is configured
 */
import type { Request, Response } from 'express';
import { googleAuthService } from '../services/googleAuth.service';
import { sendSuccess, sendError } from '../utils/response';
import { isServiceError } from '../types';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

export const googleAuthController = {
  /**
   * GET /api/auth/google/url
   * Returns the Google OAuth consent URL for the frontend to redirect to.
   */
  getAuthUrl(_req: Request, res: Response): void {
    try {
      if (!googleAuthService.isConfigured()) {
        sendError(res, 503, 'SSO_NOT_CONFIGURED', 'Google SSO is not configured');
        return;
      }
      const state = (_req.query.state as string) ?? 'login';
      const url = googleAuthService.generateAuthUrl(state);
      sendSuccess(res, { url });
    } catch (err) {
      sendError(res, 500, 'SSO_URL_ERROR', 'Failed to generate Google auth URL');
    }
  },

  /**
   * GET /api/auth/google/callback
   * Handles the OAuth redirect from Google — exchanges code, issues session cookies,
   * and redirects to the frontend.
   */
  async callback(req: Request, res: Response): Promise<void> {
    try {
      const code = req.query.code as string | undefined;
      const error = req.query.error as string | undefined;

      if (error) {
        res.redirect(`${FRONTEND_URL}/login?error=google_auth_denied`);
        return;
      }

      if (!code) {
        res.redirect(`${FRONTEND_URL}/login?error=google_auth_missing_code`);
        return;
      }

      await googleAuthService.handleCallback(code, res);

      // Redirect to dashboard after successful login
      const state = (req.query.state as string) ?? 'login';
      const redirectPath = state.startsWith('/') ? state : '/dashboard';
      res.redirect(`${FRONTEND_URL}${redirectPath}`);
    } catch (err) {
      if (isServiceError(err)) {
        const errorParam = encodeURIComponent(err.code);
        res.redirect(`${FRONTEND_URL}/login?error=${errorParam}`);
      } else {
        res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
      }
    }
  },

  /**
   * GET /api/auth/google/status
   * Returns whether Google SSO is available.
   */
  getStatus(_req: Request, res: Response): void {
    sendSuccess(res, { configured: googleAuthService.isConfigured() });
  },
};
