import type { Request, Response } from 'express';
import { paymentsService } from './payments.service.js';

export const paymentsController = {
  /**
   * Public endpoint — Safaricom calls this directly, no JWT auth.
   * Always responds 200 { ResultCode: 0 } to acknowledge receipt per Daraja contract.
   * Actual success/failure is inside req.body and handled in the service.
   */
  async mpesaCallback(req: Request, res: Response) {
    await paymentsService.handleMpesaCallback(req.body);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  },

  async getStatus(req: Request, res: Response) {
    const payment = await paymentsService.getStatus(req.params.bookingId);
    res.json({ payment });
  },
};
