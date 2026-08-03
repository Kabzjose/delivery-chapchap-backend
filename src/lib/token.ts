import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * The payload embedded in every access token.
 * Keep this small — it's included in every authenticated request header.
 */
export interface AccessTokenPayload {
  sub: string; // userId
  role: 'CUSTOMER' | 'RIDER' | 'ADMIN' | 'BUSINESS';
}

/**
 * The payload embedded in every refresh token.
 * Intentionally minimal — the refresh token's only job is to prove the user's
 * identity so we can look them up and issue a fresh access token.
 */
export interface RefreshTokenPayload {
  sub: string; // userId
}

/**
 * Signs a short-lived access token (default 15 min).
 * The frontend keeps this in memory/state and attaches it as:
 *   Authorization: Bearer <token>
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

/**
 * Signs a longer-lived refresh token (default 7 days).
 * This goes into an httpOnly cookie — never readable by JavaScript on the page.
 */
export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

/**
 * Verifies and decodes an access token.
 * Throws a JsonWebTokenError/TokenExpiredError if the token is invalid or expired —
 * callers should catch these and convert to UnauthorizedError.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/**
 * Verifies and decodes a refresh token.
 * Same throw behaviour as verifyAccessToken.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
