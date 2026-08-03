import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './config/db.js';

/**
 * Process entrypoint — starts the HTTP server and wires up graceful shutdown.
 *
 * Kept separate from app.ts by design: app.ts is pure configuration with no side
 * effects, making it importable in tests. This file owns the lifecycle concerns
 * (binding to a port, cleaning up resources on exit) that don't belong in tests.
 */
const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
});

/**
 * Graceful shutdown handler.
 *
 * On SIGINT (Ctrl+C) or SIGTERM (sent by Docker/Kubernetes during a rolling deploy):
 *  1. Stop accepting new connections.
 *  2. Disconnect Prisma so the DB connection pool is released cleanly.
 *  3. Exit with code 0 (success) so orchestrators don't treat it as a crash.
 *
 * Without this, a forceful kill during a deploy can leave in-flight DB transactions
 * in an undefined state or leave connections dangling in the pool.
 */
async function shutdown() {
  logger.info('Shutting down gracefully...');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
