import { prisma } from '../../config/db.js';
import type { Role } from '@prisma/client';

/**
 * All database access for the auth module lives here — nowhere else.
 *
 * This repository pattern means:
 *  - The service layer stays ignorant of Prisma's API.
 *  - If you ever swap ORMs, add a Redis cache layer, or need to mock the DB
 *    in unit tests, you only touch this file.
 *  - Each method is a small, named, testable unit instead of inline query strings.
 */
export const authRepository = {
  /** Look up a user by email — used during login and registration duplicate-check. */
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  /** Look up a user by primary key — used when validating a refresh token. */
  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  /**
   * Insert a new user row.
   * passwordHash is stored, never the raw password.
   * role defaults to CUSTOMER if omitted — admin/rider creation goes through a
   * separate admin-only endpoint, not here.
   */
  createUser(data: {
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
    role?: Role;
  }) {
    return prisma.user.create({ data });
  },

  /** Persist a refresh token record so we can validate and revoke it later. */
  storeRefreshToken(data: { token: string; userId: string; expiresAt: Date }) {
    return prisma.refreshToken.create({ data });
  },

  /**
   * Retrieve a stored refresh token by its value.
   * Returns null if not found, so callers must handle the missing case explicitly.
   */
  findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({ where: { token } });
  },

  /**
   * Mark a single refresh token as revoked.
   * Called on logout or token rotation — the row stays in the DB for audit purposes
   * but will never be accepted again.
   */
  revokeRefreshToken(token: string) {
    return prisma.refreshToken.update({
      where: { token },
      data: { revoked: true },
    });
  },

  /**
   * Revoke every refresh token for a given user in one query.
   * Useful for security events: password change, account suspension, "logout everywhere".
   */
  revokeAllUserTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });
  },
};
