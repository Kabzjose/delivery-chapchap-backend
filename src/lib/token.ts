import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AccessTokenPayload {
  sub: string; // userId
  role: 'CUSTOMER' | 'RIDER' | 'ADMIN' | 'BUSINESS';
}

export interface RefreshTokenPayload {
  sub: string; // userId
}

// Short-lived access token (default 15 min) — attached as Authorization: Bearer <token> on each request.
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

// Longer-lived refresh token (default 7 days) — stored in an httpOnly cookie, never readable by JS.
export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

// Throws JsonWebTokenError / TokenExpiredError on failure — callers should catch and convert to UnauthorizedError.
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
