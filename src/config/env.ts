import { z } from 'zod';
import 'dotenv/config';

/**
 * Validates all required environment variables at startup.
 * If any required variable is missing or malformed, the process exits immediately
 * rather than failing silently at runtime (e.g. undefined JWT_SECRET would let
 * anyone forge tokens).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),

  // JWT secrets — enforce a minimum length so weak secrets are caught early
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  // Access tokens are short-lived (default 15 minutes); refresh tokens live longer (default 7 days)
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  /**
   * The domain attribute on the refreshToken cookie.
   * In development leave this undefined so the cookie works on localhost.
   * In production set it to your root domain, e.g. "chapchap.co.ke"
   */
  COOKIE_DOMAIN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
