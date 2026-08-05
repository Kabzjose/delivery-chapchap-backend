import { pricingRepository } from './pricing.repository.js';
import { NotFoundError } from '../../lib/errors.js';
import type { QuoteInput } from './pricing.schema.js';

const FRAGILE_SURCHARGE_MULTIPLIER = 1.15;
const HEAVY_THRESHOLD_KG = 10;
const EXTRA_PER_KG_OVER_THRESHOLD = 20;

export const pricingService = {
  listZones() {
    return pricingRepository.listZones();
  },

  async calculateQuote(input: QuoteInput) {
    const route = await pricingRepository.findRoute(input.pickupZoneId, input.dropoffZoneId);
    if (!route) {
      throw new NotFoundError('No pricing route found for these zones');
    }

    let price = route.price;

    if (input.packageType === 'FRAGILE' || input.packageType === 'ELECTRONICS') {
      price *= FRAGILE_SURCHARGE_MULTIPLIER;
    }

    if (input.weightKg > HEAVY_THRESHOLD_KG) {
      price += (input.weightKg - HEAVY_THRESHOLD_KG) * EXTRA_PER_KG_OVER_THRESHOLD;
    }

    return {
      price: Math.round(price),
      breakdown: {
        basePrice: route.price,
        packageType: input.packageType,
        weightKg: input.weightKg,
      },
    };
  },
};
