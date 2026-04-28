/**
 * @file role.middleware.ts
 * @description Role-based access control middleware.
 *
 * Usage: `router.post('/admin-only', authenticate, requireRole('ADMIN'), handler)`
 * Must be placed after `authenticate` so `req.user` is populated.
 */
import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../types';
import { sendError } from '../utils/response';

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = (req as AuthRequest).user?.role;
    if (!role || !allowedRoles.includes(role)) {
      sendError(res, 403, 'FORBIDDEN', 'You do not have permission to perform this action');
      return;
    }
    next();
  };
}
