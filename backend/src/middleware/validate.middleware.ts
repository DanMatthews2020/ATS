/**
 * @file validate.middleware.ts
 * @description Zod request validation middleware factory.
 *
 * Usage: `router.post('/login', validate(LoginSchema), handler)`
 *
 * Validates `req.body`, `req.query`, or `req.params` against the given Zod
 * schema. On success, replaces the target with the parsed (coerced) value so
 * handlers receive clean, typed data. On failure, responds with 422 and a
 * structured list of field errors.
 */
import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { sendError } from '../utils/response';

type Target = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', details);
      return;
    }

    // Replace the target with the parsed (coerced) value
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}
