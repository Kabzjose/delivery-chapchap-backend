import { PrismaClient } from '@prisma/client';

// Singleton Prisma client — instantiating multiple times creates multiple connection pools.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});
