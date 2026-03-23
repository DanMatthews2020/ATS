import type { Request } from 'express';

// ─── Authenticated request ────────────────────────────────────────────────────

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Service errors ───────────────────────────────────────────────────────────

export interface ServiceError {
  statusCode: number;
  code: string;
  message: string;
}

export function isServiceError(err: unknown): err is ServiceError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    'code' in err &&
    'message' in err
  );
}
