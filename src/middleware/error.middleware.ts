import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

// Central error handler — must be registered last in app.ts so all next(err) calls land here.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        message: 'Validation failed',
        fields: err.flatten().fieldErrors,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error({ err }, err.message);
    res.status(err.statusCode).json({ error: { message: err.message } });
    return;
  }

  // Unknown error — log the full details but never expose internals to the client.
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: { message: 'An unexpected error occurred' } });
}
