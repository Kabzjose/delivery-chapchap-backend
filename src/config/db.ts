import { PrismaClient } from '@prisma/client';

/**
 * A single shared Prisma client instance for the whole process.
 *
 * Why a singleton? Prisma manages a connection pool internally. Instantiating
 * it multiple times (e.g. once per module) creates multiple pools, which wastes
 * connections and can exhaust the database's limit under load.
 *
 * In tests you can swap this out for a test-database URL via DATABASE_URL env var
 * without changing any service code.
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});
