import bcrypt from 'bcrypt';
import { authRepository } from './auth.repository.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/token.js';
import { ConflictError, UnauthorizedError } from '../../lib/errors.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';

/** How many bcrypt rounds to use when hashing passwords.
 *  12 is a reasonable modern default: slow enough to deter brute force,
 *  fast enough that a single login doesn't visibly lag (~300 ms on typical hardware). */
const SALT_ROUNDS = 12;

/** How long (in days) a refresh token is valid before it must be re-issued. */
const REFRESH_TOKEN_TTL_DAYS = 7;

/** Compute the absolute expiry Date for a new refresh token. */
function refreshExpiryDate(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Internal helper — signs both token types and persists the refresh token in one step.
 * Extracted here so register, login, and refresh all use the exact same flow.
 */
async function issueTokenPair(
  userId: string,
  role: 'CUSTOMER' | 'RIDER' | 'ADMIN' | 'BUSINESS',
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken({ sub: userId, role });
  const refreshToken = signRefreshToken({ sub: userId });

  // Persist the refresh token so we can validate, rotate, and revoke it later
  await authRepository.storeRefreshToken({
    token: refreshToken,
    userId,
    expiresAt: refreshExpiryDate(),
  });

  return { accessToken, refreshToken };
}

export const authService = {
  /**
   * Create a new CUSTOMER account and return a token pair.
   *
   * Public registration is always CUSTOMER — riders and admins are created via
   * dedicated admin-only endpoints built in a later phase.
   */
  async register(input: RegisterInput) {
    // Prevent duplicate accounts — throw before hashing to save bcrypt work
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await authRepository.createUser({
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: 'CUSTOMER',
    });

    const tokens = await issueTokenPair(user.id, user.role);

    return {
      // Only expose safe fields — never return passwordHash, even indirectly
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    };
  },

  /**
   * Validate credentials and return a token pair.
   *
   * Security: we return the SAME error message whether the email doesn't exist or
   * the password is wrong. Different messages would let an attacker enumerate which
   * email addresses are registered in this system.
   */
  async login(input: LoginInput) {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check after password validation so we don't leak account existence
    if (!user.isActive) {
      throw new UnauthorizedError('This account has been deactivated');
    }

    const tokens = await issueTokenPair(user.id, user.role);

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    };
  },

  /**
   * Validate an existing refresh token and issue a fresh token pair.
   *
   * Refresh token rotation: the old token is revoked immediately and a brand new
   * pair is issued. This means each refresh token can only be used once. If a
   * stolen token is replayed, the legitimate user's next /refresh call will fail
   * (revoked), which is your signal that something's wrong.
   */
  async refresh(oldToken: string) {
    // Step 1: verify the JWT signature and expiry
    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(oldToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Step 2: check the database record — catches revoked tokens and expired TTLs
    const stored = await authRepository.findRefreshToken(oldToken);
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token is no longer valid');
    }

    // Step 3: make sure the account still exists and is active
    const user = await authRepository.findUserById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Account no longer active');
    }

    // Step 4: rotate — revoke the consumed token, issue a brand new pair
    await authRepository.revokeRefreshToken(oldToken);
    const tokens = await issueTokenPair(user.id, user.role);

    return tokens;
  },

  /**
   * Gracefully invalidate a refresh token on user-initiated logout.
   * We silently no-op if the token isn't found — idempotent by design,
   * so double-tapping logout never throws.
   */
  async logout(token: string) {
    const stored = await authRepository.findRefreshToken(token);
    if (stored) {
      await authRepository.revokeRefreshToken(token);
    }
  },
};
