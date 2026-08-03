import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { registerSchema, loginSchema } from './auth.schema.js';

export const authRouter = Router();

/**
 * Auth routes — each line reads declaratively:
 *   "validate this shape, then handle it, catch async errors automatically"
 *
 * No logic lives in the router — keep it thin.
 *
 * POST /api/auth/register  — create account, return tokens
 * POST /api/auth/login     — verify credentials, return tokens
 * POST /api/auth/refresh   — rotate refresh token, return new access token
 * POST /api/auth/logout    — revoke refresh token, clear cookie
 */
authRouter.post('/register', validate(registerSchema), asyncHandler(authController.register));
authRouter.post('/login', validate(loginSchema), asyncHandler(authController.login));
// /refresh and /logout don't need body validation — they read from the cookie
authRouter.post('/refresh', asyncHandler(authController.refresh));
authRouter.post('/logout', asyncHandler(authController.logout));
