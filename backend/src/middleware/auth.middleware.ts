/**
 * @file auth.middleware.ts
 * @description Authentication middleware for protected Express routes.
 *
 * Token resolution order:
 *  1. `access_token` httpOnly cookie (browser clients)
 *  2. `Authorization: Bearer <token>` header (API/non-browser clients)
 *
 * On success, the decoded payload is attached to `req.user`.
 * On failure, a 401 response is sent immediately.
 */
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/response';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  // Prefer httpOnly cookie; fall back to Bearer token for non-browser clients
  const token: string | undefined =
    (req.cookies as Record<string, string> | undefined)?.access_token ??
    extractBearer(req.headers.authorization);

  if (!token) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    sendError(res, 401, 'TOKEN_EXPIRED', 'Access token is invalid or expired');
  }
}

function extractBearer(header?: string): string | undefined {
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice(7);
}
