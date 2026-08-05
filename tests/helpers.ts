import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import bcrypt from 'bcrypt';
import { signAccessToken } from '../src/lib/token.js';

export async function createUserDirect(
  role: 'CUSTOMER' | 'RIDER' | 'ADMIN',
  overrides: Partial<{ email: string; phone: string }> = {},
) {
  // Low rounds (4) for speed — this is test data only, never real credentials
  const passwordHash = await bcrypt.hash('Password123!', 4);
  return prisma.user.create({
    data: {
      name: `Test ${role}`,
      email: overrides.email ?? `${role.toLowerCase()}-${Date.now()}-${Math.random()}@test.com`,
      phone: overrides.phone ?? `+2547${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash,
      role,
    },
  });
}

/**
 * Directly mints a valid access token for a user — bypasses the login endpoint
 * so a failure in /api/auth/login can't cascade into unrelated booking tests.
 */
export function signInAs(userId: string, role: 'CUSTOMER' | 'RIDER' | 'ADMIN'): string {
  return signAccessToken({ sub: userId, role });
}

export async function createZonesAndRoute(price = 300) {
  const zoneA = await prisma.zone.create({ data: { name: `ZoneA-${Date.now()}-${Math.random()}` } });
  const zoneB = await prisma.zone.create({ data: { name: `ZoneB-${Date.now()}-${Math.random()}` } });
  await prisma.zoneRoute.create({ data: { fromZoneId: zoneA.id, toZoneId: zoneB.id, price } });
  await prisma.zoneRoute.create({ data: { fromZoneId: zoneB.id, toZoneId: zoneA.id, price } });
  return { zoneA, zoneB };
}

export async function createBookingDirect(
  customerId: string,
  pickupZoneId: string,
  dropoffZoneId: string,
  price = 300,
) {
  return prisma.booking.create({
    data: {
      customerId,
      recipientName: 'Test Recipient',
      recipientPhone: '+254712345678',
      pickupZoneId,
      pickupAddress: '123 Test St',
      dropoffZoneId,
      dropoffAddress: '456 Test Ave',
      packageType: 'PARCEL',
      weightKg: 2,
      price,
      status: 'PENDING',
      statusHistory: { create: { status: 'PENDING' } },
    },
  });
}

export { request, app, prisma };
