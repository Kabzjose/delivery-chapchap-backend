import type { Request, Response } from 'express';
import { pricingService } from './pricing.service.js';

export const pricingController = {
  async listZones(_req: Request, res: Response) {
    const zones = await pricingService.listZones();
    res.json({ zones });
  },

  async getQuote(req: Request, res: Response) {
    const quote = await pricingService.calculateQuote(req.body);
    res.json(quote);
  },
};
