import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../types';
import { sendError } from './response';

export type UserRole = 'ADMIN' | 'HR' | 'MANAGER' | 'INTERVIEWER';

export type Permission =
  | 'candidate:read' | 'candidate:write'
  | 'candidate:delete_soft' | 'candidate:delete_hard'
  | 'candidate:read_pii'
  | 'feedback:read_all' | 'feedback:write'
  | 'job:write'
  | 'gdpr:read' | 'gdpr:write' | 'gdpr:erasure'
  | 'audit_log:read' | 'admin:access';

const ALL_PERMISSIONS: Permission[] = [
  'candidate:read', 'candidate:write',
  'candidate:delete_soft', 'candidate:delete_hard',
  'candidate:read_pii',
  'feedback:read_all', 'feedback:write',
  'job:write',
  'gdpr:read', 'gdpr:write', 'gdpr:erasure',
  'audit_log:read', 'admin:access',
];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: ALL_PERMISSIONS,
  HR: [
    'candidate:read', 'candidate:write', 'candidate:delete_soft', 'candidate:read_pii',
    'feedback:read_all', 'feedback:write', 'job:write',
    'gdpr:read', 'gdpr:write', 'audit_log:read',
  ],
  MANAGER: [
    'candidate:read', 'candidate:write', 'candidate:delete_soft', 'candidate:read_pii',
    'feedback:read_all', 'feedback:write', 'job:write',
  ],
  INTERVIEWER: [
    'candidate:read', 'feedback:write',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req as AuthRequest).user?.role as UserRole;
    if (!role || !hasPermission(role, permission)) {
      sendError(res, 403, 'FORBIDDEN', 'You do not have permission to perform this action');
      return;
    }
    next();
  };
}
