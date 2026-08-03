import { z } from 'zod';

/**
 * Registration schema — validates request shape AND derives the TypeScript type.
 * Defining the shape once here means the service layer's types stay in sync with
 * runtime validation automatically; there's no duplicate interface to drift out of step.
 *
 * Phone regex is scoped to Kenyan numbers (+254 followed by exactly 9 digits).
 * Revisit if the platform expands to other markets.
 *
 * password.max(72): bcrypt silently truncates input beyond 72 bytes. Enforcing the
 * limit here makes that boundary explicit and prevents surprising edge-case behaviour.
 */
export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z
      .string()
      .regex(/^\+254\d{9}$/, 'Phone must be in format +254XXXXXXXXX'),
    password: z.string().min(8).max(72),
  }),
});

/** Login schema — kept intentionally minimal; only what the service needs. */
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

// Infer TypeScript types from the schemas so the service layer is always in sync
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
