import { Router } from 'express';
import { pricingController } from './pricing.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { quoteSchema } from './pricing.schema.js';

export const pricingRouter = Router();

pricingRouter.get('/zones', asyncHandler(pricingController.listZones));
pricingRouter.post('/quote', validate(quoteSchema), asyncHandler(pricingController.getQuote));
