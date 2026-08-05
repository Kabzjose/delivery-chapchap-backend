import { describe, it, expect } from 'vitest';
import {
  request,
  app,
  prisma,
  createUserDirect,
  signInAs,
  createZonesAndRoute,
  createBookingDirect,
} from './helpers.js';

/**
 * Shared setup: creates admin/customer/rider/otherRider, a booking, then forces
 * it into CONFIRMED with a rider assigned — the typical precondition for most tests here.
 */
async function setupConfirmedBooking() {
  const admin = await createUserDirect('ADMIN');
  const customer = await createUserDirect('CUSTOMER');
  const rider = await createUserDirect('RIDER');
  const otherRider = await createUserDirect('RIDER');
  const { zoneA, zoneB } = await createZonesAndRoute();
  const booking = await createBookingDirect(customer.id, zoneA.id, zoneB.id);
  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'CONFIRMED', riderId: rider.id },
  });
  return { admin, customer, rider, otherRider, booking };
}

describe('PATCH /api/bookings/:id/status', () => {
  it('11. assigned rider moves CONFIRMED → PICKED_UP', async () => {
    const { rider, booking } = await setupConfirmedBooking();
    const token = signInAs(rider.id, 'RIDER');

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PICKED_UP' });

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('PICKED_UP');
  });

  it('14. cannot skip PENDING → DELIVERED (state machine blocks illegal jump)', async () => {
    const admin = await createUserDirect('ADMIN');
    const customer = await createUserDirect('CUSTOMER');
    const { zoneA, zoneB } = await createZonesAndRoute();
    const booking = await createBookingDirect(customer.id, zoneA.id, zoneB.id); // starts PENDING
    const token = signInAs(admin.id, 'ADMIN');

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'DELIVERED' });

    expect(res.status).toBe(400);
  });

  it('15. cannot skip CONFIRMED → IN_TRANSIT (skips PICKED_UP)', async () => {
    const { rider, booking } = await setupConfirmedBooking();
    const token = signInAs(rider.id, 'RIDER');

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'IN_TRANSIT' });

    expect(res.status).toBe(400);
  });

  it('16. cannot update a DELIVERED (terminal) booking', async () => {
    const { rider, booking } = await setupConfirmedBooking();
    await prisma.booking.update({ where: { id: booking.id }, data: { status: 'DELIVERED' } });
    const token = signInAs(rider.id, 'RIDER');

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'IN_TRANSIT' });

    expect(res.status).toBe(400);
  });

  it('17. cannot update a CANCELLED (terminal) booking', async () => {
    const { rider, booking } = await setupConfirmedBooking();
    await prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } });
    const token = signInAs(rider.id, 'RIDER');

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CONFIRMED' });

    expect(res.status).toBe(400);
  });

  it('18. a different (unassigned) rider cannot update this booking — 403', async () => {
    const { otherRider, booking } = await setupConfirmedBooking();
    const token = signInAs(otherRider.id, 'RIDER');

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PICKED_UP' });

    expect(res.status).toBe(403);
  });

  it('19. the booking\'s own customer cannot update its status — 403', async () => {
    const { customer, booking } = await setupConfirmedBooking();
    const token = signInAs(customer.id, 'CUSTOMER');

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PICKED_UP' });

    expect(res.status).toBe(403);
  });

  it('20. admin can update any booking status without being the assigned rider', async () => {
    const { admin, booking } = await setupConfirmedBooking();
    const token = signInAs(admin.id, 'ADMIN');

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PICKED_UP' });

    expect(res.status).toBe(200);
  });

  it('21. PENDING → CANCELLED is a valid transition', async () => {
    const admin = await createUserDirect('ADMIN');
    const customer = await createUserDirect('CUSTOMER');
    const { zoneA, zoneB } = await createZonesAndRoute();
    const booking = await createBookingDirect(customer.id, zoneA.id, zoneB.id);
    const token = signInAs(admin.id, 'ADMIN');

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CANCELLED' });

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('CANCELLED');
  });

  it('22. cannot cancel a booking once IN_TRANSIT (intentional — package already en route)', async () => {
    const { rider, booking } = await setupConfirmedBooking();
    await prisma.booking.update({ where: { id: booking.id }, data: { status: 'IN_TRANSIT' } });
    const token = signInAs(rider.id, 'RIDER');

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CANCELLED' });

    expect(res.status).toBe(400);
  });

  it('23. rejects a status value not in the enum (e.g. SHIPPED)', async () => {
    const { rider, booking } = await setupConfirmedBooking();
    const token = signInAs(rider.id, 'RIDER');

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SHIPPED' });

    expect(res.status).toBe(400);
  });

  it('24. missing status field fails validation — 400', async () => {
    const { rider, booking } = await setupConfirmedBooking();
    const token = signInAs(rider.id, 'RIDER');

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('25. unauthenticated status update is rejected — 401', async () => {
    const res = await request(app)
      .patch('/api/bookings/00000000-0000-0000-0000-000000000000/status')
      .send({ status: 'PICKED_UP' });

    expect(res.status).toBe(401);
  });

  it('26. full lifecycle CONFIRMED→PICKED_UP→IN_TRANSIT→DELIVERED with correct statusHistory order', async () => {
    const { admin, rider, booking } = await setupConfirmedBooking();
    const riderToken = signInAs(rider.id, 'RIDER');
    const adminToken = signInAs(admin.id, 'ADMIN');

    await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ status: 'PICKED_UP' });

    await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ status: 'IN_TRANSIT' });

    const finalRes = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ status: 'DELIVERED' });

    expect(finalRes.status).toBe(200);
    expect(finalRes.body.booking.status).toBe('DELIVERED');

    const getRes = await request(app)
      .get(`/api/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const statuses = getRes.body.booking.statusHistory.map((h: { status: string }) => h.status);
    // The setup helper creates PENDING, assignRider adds CONFIRMED — then our 3 transitions
    expect(statuses).toEqual(['PENDING', 'CONFIRMED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']);
  });
});
