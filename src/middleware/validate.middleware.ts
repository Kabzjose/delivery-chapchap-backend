import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

// Validates { body, query, params } against the given Zod schema before the request reaches the controller.
// On failure a ZodError is thrown and forwarded to errorHandler, which formats it into per-field messages.
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
      next(err);
    }
  };
}
