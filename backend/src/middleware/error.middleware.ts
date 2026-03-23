/**
 * @file error.middleware.ts
 * @description Global Express error handling middleware.
 *
 * `errorHandler` — catches errors thrown by route handlers and services,
 *   normalises them into the standard error envelope, and hides internal
 *   details for 500-level errors.
 *
 * `notFound` — fallback handler for any route that didn't match, returns 404.
 */
import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';
  const message = statusCode === 500 ? 'An unexpected error occurred' : err.message;

  if (statusCode === 500) {
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({ success: false, error: { code, message } });
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'The requested resource was not found' },
  });
}
