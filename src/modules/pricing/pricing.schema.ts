import { z } from 'zod';

export const quoteSchema = z.object({
  body: z.object({
    pickupZoneId: z.string().uuid(),
    dropoffZoneId: z.string().uuid(),
    packageType: z.enum(['DOCUMENT', 'PARCEL', 'FRAGILE', 'ELECTRONICS', 'OTHER']),
    weightKg: z.coerce.number().positive().max(500),
  }),
});

export type QuoteInput = z.infer<typeof quoteSchema>['body'];
