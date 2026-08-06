import { z } from 'zod';

export const createBookingSchema = z.object({
  body: z.object({
    recipientName: z.string().min(2).max(100),
    recipientPhone: z.string().regex(/^\+254\d{9}$/, 'Phone must be in format +254XXXXXXXXX'),
    payerPhone: z.string().regex(/^\+254\d{9}$/, 'Phone must be in format +254XXXXXXXXX'),
    pickupZoneId: z.string().uuid(),
    pickupAddress: z.string().min(5).max(255),
    dropoffZoneId: z.string().uuid(),
    dropoffAddress: z.string().min(5).max(255),
    packageType: z.enum(['DOCUMENT', 'PARCEL', 'FRAGILE', 'ELECTRONICS', 'OTHER']),
    weightKg: z.coerce.number().positive().max(500),
    specialInstructions: z.string().max(500).optional(),
  }),
});

export const updateStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    // PENDING and AWAITING_PAYMENT are system-set only — never manually settable
    status: z.enum(['CONFIRMED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']),
    note: z.string().max(255).optional(),
  }),
});

export const assignRiderSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    riderId: z.string().uuid(),
  }),
});

export const listBookingsQuerySchema = z.object({
  query: z.object({
    status: z
      .enum(['AWAITING_PAYMENT', 'PENDING', 'CONFIRMED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'])
      .optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>['body'];
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>['body'];
