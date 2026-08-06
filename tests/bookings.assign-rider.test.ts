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

describe('PATCH /api/bookings/:id/assign-rider', () => {
  it('1. happy path: admin assigns a valid rider, booking moves to CONFIRMED with riderId set', async () => {
    const admin = await createUserDirect('ADMIN');
    const customer = await createUserDirect('CUSTOMER');
    const rider = await createUserDirect('RIDER');
    const { zoneA, zoneB } = await createZonesAndRoute();
    const booking = await createBookingDirect(customer.id, zoneA.id, zoneB.id);
    const token = signInAs(admin.id, 'ADMIN');

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/assign-rider`)
      .set('Authorization', `Bearer ${token}`)
      .send({ riderId: rider.id });

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('CONFIRMED');
    expect(res.body.booking.riderId).toBe(rider.id);
  });

  it('2. non-admin (customer) cannot assign a rider — 403', async () => {
    const customer = await createUserDirect('CUSTOMER');
    const rider = await createUserDirect('RIDER');
    const { zoneA, zoneB } = await createZonesAndRoute();
    const booking = await createBookingDirect(customer.id, zoneA.id, zoneB.id);
    const token = signInAs(customer.id, 'CUSTOMER');

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/assign-rider`)
      .set('Authorization', `Bearer ${token}`)
      .send({ riderId: rider.id });

    expect(res.status).toBe(403);
  });

  it('3. unauthenticated request is rejected — 401', async () => {
    const res = await request(app)
      .patch('/api/bookings/00000000-0000-0000-0000-000000000000/assign-rider')
      .send({ riderId: '00000000-0000-0000-0000-000000000001' });

    expect(res.status).toBe(401);
  });

  it('4. assigning to a non-existent booking returns 404', async () => {
    const admin = await createUserDirect('ADMIN');
    const rider = await createUserDirect('RIDER');
    const token = signInAs(admin.id, 'ADMIN');

    const res = await request(app)
      .patch('/api/bookings/00000000-0000-0000-0000-000000000000/assign-rider')
      .set('Authorization', `Bearer ${token}`)
      .send({ riderId: rider.id });

    expect(res.status).toBe(404);
  });

  it('5. cannot assign rider to a DELIVERED booking — 400', async () => {
    const admin = await createUserDirect('ADMIN');
    const customer = await createUserDirect('CUSTOMER');
    const rider = await createUserDirect('RIDER');
    const { zoneA, zoneB } = await createZonesAndRoute();
    const booking = await createBookingDirect(customer.id, zoneA.id, zoneB.id);
    await prisma.booking.update({ where: { id: booking.id }, data: { status: 'DELIVERED' } });

    const token = signInAs(admin.id, 'ADMIN');
    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/assign-rider`)
      .set('Authorization', `Bearer ${token}`)
      .send({ riderId: rider.id });

    expect(res.status).toBe(400);
  });

  it('6. cannot assign rider to a CANCELLED booking — 400', async () => {
    const admin = await createUserDirect('ADMIN');
    const customer = await createUserDirect('CUSTOMER');
    const rider = await createUserDirect('RIDER');
    const { zoneA, zoneB } = await createZonesAndRoute();
    const booking = await createBookingDirect(customer.id, zoneA.id, zoneB.id);
    await prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } });

    const token = signInAs(admin.id, 'ADMIN');
    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/assign-rider`)
      .set('Authorization', `Bearer ${token}`)
      .send({ riderId: rider.id });

    expect(res.status).toBe(400);
  });

  it('7. assigning a non-existent riderId fails — 400', async () => {
    const admin = await createUserDirect('ADMIN');
    const customer = await createUserDirect('CUSTOMER');
    const { zoneA, zoneB } = await createZonesAndRoute();
    const booking = await createBookingDirect(customer.id, zoneA.id, zoneB.id);
    const token = signInAs(admin.id, 'ADMIN');

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/assign-rider`)
      .set('Authorization', `Bearer ${token}`)
      .send({ riderId: '00000000-0000-0000-0000-000000000099' });

    expect(res.status).toBe(400);
  });

  it('8. passing a customer\'s id as riderId fails (wrong role) — 400', async () => {
    const admin = await createUserDirect('ADMIN');
    const customer = await createUserDirect('CUSTOMER');
    const anotherCustomer = await createUserDirect('CUSTOMER');
    const { zoneA, zoneB } = await createZonesAndRoute();
    const booking = await createBookingDirect(customer.id, zoneA.id, zoneB.id);
    const token = signInAs(admin.id, 'ADMIN');

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/assign-rider`)
      .set('Authorization', `Bearer ${token}`)
      .send({ riderId: anotherCustomer.id });

    expect(res.status).toBe(400);
  });

  it('9. missing riderId in body fails validation — 400', async () => {
    const admin = await createUserDirect('ADMIN');
    const customer = await createUserDirect('CUSTOMER');
    const { zoneA, zoneB } = await createZonesAndRoute();
    const booking = await createBookingDirect(customer.id, zoneA.id, zoneB.id);
    const token = signInAs(admin.id, 'ADMIN');

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/assign-rider`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(422); // Zod schema rejects missing riderId
  });
});
