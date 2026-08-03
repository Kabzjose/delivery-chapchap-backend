import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async Express route handler so that any rejected promise is forwarded
 * to next() automatically — without this wrapper you'd need try/catch in every
 * controller method, which is noisy and easy to forget.
 *
 * Usage:
 *   router.get('/foo', asyncHandler(myAsyncController))
 *
 * Any thrown AppError (or ZodError from the validate middleware) will land in
 * errorHandler, which knows how to convert them into structured JSON responses.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
