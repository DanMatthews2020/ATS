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
