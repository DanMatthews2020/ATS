/**
 * @file response.ts
 * @description Typed HTTP response helpers.
 *
 * All API responses follow a consistent envelope:
 *  - Success: `{ success: true, data: T }`
 *  - Error:   `{ success: false, error: { code, message, details? } }`
 */
import type { Response } from 'express';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Sends a successful JSON response wrapped in the standard envelope. */
export function sendSuccess<T>(res: Response, data: T, status = 200): Response {
  const body: ApiSuccess<T> = { success: true, data };
  return res.status(status).json(body);
}

/** Sends an error JSON response wrapped in the standard envelope. */
export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  const body: ApiError = {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
  return res.status(status).json(body);
}
