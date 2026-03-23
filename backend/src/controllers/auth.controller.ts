/**
 * @file auth.controller.ts
 * @description HTTP request handlers for authentication endpoints.
 *
 * All tokens are stored as httpOnly cookies (not returned in the response body)
 * to prevent JavaScript access. The `secure` flag is set only in production.
 * Cookie options are defined once in COOKIE_BASE and extended per-cookie.
 */
import type { Request, Response } from 'express';
import type { AuthRequest } from '../types';
import { authService } from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/response';
import { isServiceError } from '../types';

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const result = await authService.login(email, password);

      res.cookie('access_token', result.accessToken, {
        ...COOKIE_BASE,
        maxAge: 15 * 60 * 1000, // 15 min
      });
      res.cookie('refresh_token', result.refreshToken, {
        ...COOKIE_BASE,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      sendSuccess(res, { user: result.user });
    } catch (err) {
      if (isServiceError(err)) {
        sendError(res, err.statusCode, err.code, err.message);
      } else {
        sendError(res, 500, 'LOGIN_ERROR', 'Login failed');
      }
    }
  },

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = (req.cookies as Record<string, string> | undefined)?.refresh_token;

      if (!refreshToken) {
        sendError(res, 401, 'NO_REFRESH_TOKEN', 'No refresh token provided');
        return;
      }

      const result = await authService.refresh(refreshToken);

      res.cookie('access_token', result.accessToken, {
        ...COOKIE_BASE,
        maxAge: 15 * 60 * 1000,
      });
      res.cookie('refresh_token', result.refreshToken, {
        ...COOKIE_BASE,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      sendSuccess(res, { message: 'Tokens refreshed' });
    } catch (err) {
      if (isServiceError(err)) {
        sendError(res, err.statusCode, err.code, err.message);
      } else {
        sendError(res, 500, 'REFRESH_ERROR', 'Token refresh failed');
      }
    }
  },

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = (req.cookies as Record<string, string> | undefined)?.refresh_token;
      if (refreshToken) await authService.logout(refreshToken);

      res.clearCookie('access_token', COOKIE_BASE);
      res.clearCookie('refresh_token', COOKIE_BASE);

      sendSuccess(res, { message: 'Logged out successfully' });
    } catch {
      sendError(res, 500, 'LOGOUT_ERROR', 'Logout failed');
    }
  },

  async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await authService.getMe(req.user!.userId);
      sendSuccess(res, { user });
    } catch (err) {
      if (isServiceError(err)) {
        sendError(res, err.statusCode, err.code, err.message);
      } else {
        sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch user');
      }
    }
  },
};
