import { Router } from 'express';
import { paymentsController } from './payments.controller.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware .js';

export const paymentsRouter = Router();

// Public — Safaricom calls this; cannot carry our JWT
paymentsRouter.post('/mpesa/callback', asyncHandler(paymentsController.mpesaCallback));

// Authenticated — customer polling their own payment status
paymentsRouter.get(
  '/booking/:bookingId',
  requireAuth,
  asyncHandler(paymentsController.getStatus),
);
