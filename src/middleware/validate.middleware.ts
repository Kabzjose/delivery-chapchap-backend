import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Generic request-validation middleware factory.
 *
 * Accepts any Zod schema whose top-level keys match the shape
 * { body?, query?, params? } and validates the incoming request against it
 * before the request reaches the controller.
 *
 * On failure a ZodError is thrown. Our central errorHandler detects ZodErrors and
 * formats them into per-field error messages so the client knows exactly what to fix.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), asyncHandler(controller.register))
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      // Forward the ZodError to Express's error pipeline — errorHandler handles the rest
      next(err);
    }
  };
}
