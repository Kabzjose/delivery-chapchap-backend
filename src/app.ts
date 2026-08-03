import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/error.middleware.js';
import { authRouter } from './modules/auth/auth.routes.js';

/**
 * The configured Express application — exported without binding to a port.
 *
 * Keeping app.ts side-effect-free means you can import it in tests (e.g. with
 * supertest) without ever starting a real server or occupying a network port.
 * The actual listen() call lives in server.ts.
 */
export const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
// helmet sets sensible defaults: X-Frame-Options, Content-Security-Policy, etc.
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
// origin: true reflects the request origin back — convenient during development.
// TODO: in production, lock this down to your actual frontend URL(s), e.g.:
//   origin: ['https://chapchap.co.ke']
app.use(cors({ origin: true, credentials: true }));

// ── Cookie & body parsing ─────────────────────────────────────────────────────
// cookieParser must come before any middleware or route that reads req.cookies
app.use(cookieParser());
app.use(express.json());

// ── HTTP request logging ──────────────────────────────────────────────────────
// pinoHttp attaches a child logger to every request, so log lines are correlated
// to the request they belong to (method, url, statusCode, responseTime).
app.use(pinoHttp({ logger }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Applied to all /api routes — 300 requests per 15 minutes per IP.
// Adjust limit per route (e.g. tighter on /login) once you have real traffic data.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 300,
    standardHeaders: true,  // Return rate-limit info in the RateLimit-* headers
    legacyHeaders: false,   // Disable the deprecated X-RateLimit-* headers
  }),
);

// ── Health check ──────────────────────────────────────────────────────────────
// Simple liveness probe — useful for Docker healthchecks and load balancer probes
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Route modules ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);

// ── Error handler — MUST be last ─────────────────────────────────────────────
// Express identifies error-handling middleware by its 4-argument signature.
// Any middleware or route that calls next(err) will land here.
app.use(errorHandler);
