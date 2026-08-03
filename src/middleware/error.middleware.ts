import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

/**
 * Central error handler — must be registered last in app.ts so Express routes
 * all errors here via next(err).
 *
 * Handles three distinct error types:
 *  1. ZodError      → 422 Unprocessable Entity with per-field messages
 *  2. AppError      → HTTP status + message we set intentionally (e.g. 401, 409)
 *  3. Unknown Error → 500 Internal Server Error, original logged but not leaked to client
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // --- Zod validation failure ---
  if (err instanceof ZodError) {
    // Flatten to { fieldName: ['message', ...] } so the client can highlight the exact field
    const fieldErrors = err.flatten().fieldErrors;
    res.status(422).json({
      error: {
        message: 'Validation failed',
        fields: fieldErrors,
      },
    });
    return;
  }

  // --- Known application error (thrown deliberately in service/controller layer) ---
  if (err instanceof AppError) {
    // Don't log 4xx errors as they're expected user mistakes, not system problems.
    // Log 5xx AppErrors so we know something unusual happened in our own code.
    if (err.statusCode >= 500) {
      logger.error({ err }, err.message);
    }
    res.status(err.statusCode).json({ error: { message: err.message } });
    return;
  }

  // --- Unexpected/unknown error ---
  // Always log the full error so we can debug it, but never reveal internals to the client.
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: { message: 'An unexpected error occurred' } });
}
