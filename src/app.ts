import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/error.middleware.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { pricingRouter } from './modules/pricing/pricing.routes.js';
import { bookingsRouter } from './modules/bookings/bookings.routes.js';

// Exported without side effects so tests can import it without binding to a port.
export const app = express();

app.use(helmet());
// TODO: lock origin down to your frontend URL(s) in production instead of `true`.
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(pinoHttp({ logger }));

// 300 req / 15 min per IP across all /api routes.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/bookings', bookingsRouter);

// errorHandler must be last — Express routes errors to 4-arg middleware registered at the end.
app.use(errorHandler);
