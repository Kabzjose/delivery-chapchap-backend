import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './config/db.js';

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
});

// Closes the HTTP server and DB connection cleanly on SIGINT/SIGTERM (e.g. Ctrl+C or a rolling deploy).
async function shutdown() {
  logger.info('Shutting down gracefully...');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
