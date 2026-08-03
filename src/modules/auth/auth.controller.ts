import type { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { env } from '../../config/env.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

/**
 * Set the refresh token as an httpOnly cookie on the response.
 *
 * httpOnly  → JavaScript on the page cannot read the cookie — XSS-safe.
 * secure    → Only sent over HTTPS in production (localhost exempted in dev).
 * sameSite  → 'strict' means the browser only sends it on same-site navigations,
 *              defending against CSRF attacks.
 * path      → Scoped to /api/auth so the browser won't send the cookie to
 *              unrelated endpoints (e.g. /api/orders), reducing the attack surface.
 * domain    → Set from env — undefined in dev (works on localhost automatically).
 */
function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    domain: env.COOKIE_DOMAIN,
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds — must match token TTL
  });
}

/**
 * HTTP layer only — read request, call service, shape response.
 * No business logic lives here; the controller's only job is HTTP plumbing.
 *
 * Token strategy:
 *  - accessToken  → JSON body. Frontend keeps it in memory/state and attaches it as
 *                   Authorization: Bearer <token> on every API request.
 *  - refreshToken → httpOnly cookie. Never visible to JavaScript; browser sends it
 *                   automatically to /api/auth/refresh when the access token expires.
 */
export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    setRefreshCookie(res, result.refreshToken);
    // Return only the access token and safe user fields — never the refresh token in JSON
    res.status(201).json({ user: result.user, accessToken: result.accessToken });
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({ user: result.user, accessToken: result.accessToken });
  },

  async refresh(req: Request, res: Response) {
    // The cookie is sent automatically by the browser — extract it here
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: { message: 'No refresh token provided' } });
    }

    const result = await authService.refresh(token);
    // Issue a new cookie with the rotated refresh token
    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({ accessToken: result.accessToken });
  },

  async logout(req: Request, res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token) {
      // Revoke in the database — silently ignores if token is already gone
      await authService.logout(token);
    }
    // Clear the cookie regardless of whether a token was present (idempotent logout)
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    res.status(204).send();
  },
};
