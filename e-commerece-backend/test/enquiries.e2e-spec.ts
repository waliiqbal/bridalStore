import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { api, createTestApp, loginAsAdmin } from './helpers/app.js';

const valid = {
  name: 'Ayesha Khan',
  phone: '+61 400 111 222',
  email: 'ayesha@example.com',
  budget: '1000_2000',
  eventDate: '2099-03-14',
  outfitTypes: ['LEHENGA', 'GHARARA'],
  message: 'Looking for a Barat lehenga in red.',
  source: 'window',
};

describe('Enquiries', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    cookie = await loginAsAdmin(app);
    await prisma.enquiry.deleteMany();
  });

  afterAll(async () => {
    await prisma.enquiry.deleteMany();
    await app.close();
  });

  it('lists the form choices publicly', async () => {
    const res = await api(app).get('/api/enquiries/options').expect(200);
    expect(res.body.budgets.length).toBeGreaterThan(3);
    expect(res.body.outfitTypes.map((o: { code: string }) => o.code)).toContain('LEHENGA');
  });

  it('saves a valid enquiry with the QR source', async () => {
    await api(app).post('/api/enquiries').send(valid).expect(201);
    const saved = await prisma.enquiry.findFirstOrThrow();
    expect(saved).toMatchObject({
      name: 'Ayesha Khan',
      budget: '1000_2000',
      source: 'window',
      status: 'NEW',
      outfitTypes: ['LEHENGA', 'GHARARA'],
    });
    expect(saved.eventDate?.toISOString().slice(0, 10)).toBe('2099-03-14');
  });

  it('only needs a name and phone', async () => {
    await api(app).post('/api/enquiries').send({ name: 'Sara Ali', phone: '0400 222 333' }).expect(201);
    const saved = await prisma.enquiry.findFirstOrThrow({
      where: { name: 'Sara Ali' },
    });
    expect(saved).toMatchObject({
      email: null,
      budget: null,
      eventDate: null,
      source: 'website',
    });
  });

  it('turns empty boxes into "not filled in"', async () => {
    await api(app)
      .post('/api/enquiries')
      .send({
        name: 'Mina Raza',
        phone: '0400 333 444',
        email: '',
        budget: '',
        eventDate: '',
        message: '  ',
      })
      .expect(201);
    const saved = await prisma.enquiry.findFirstOrThrow({
      where: { name: 'Mina Raza' },
    });
    expect(saved).toMatchObject({
      email: null,
      budget: null,
      eventDate: null,
      message: null,
    });
  });

  // (Field-by-field rules are in enquiry.dto.spec.ts. Each request here counts towards the
  // 5-a-minute limit, so this file keeps its sign-ups to five.)
  it('rejects bad input with a clear message', async () => {
    const res = await api(app)
      .post('/api/enquiries')
      .send({ ...valid, phone: 'abc' })
      .expect(400);
    expect(res.body.message).toContain('Please enter a valid phone number');
  });

  it('silently ignores robots that fill the hidden box', async () => {
    const before = await prisma.enquiry.count();
    await api(app)
      .post('/api/enquiries')
      .send({ ...valid, website: 'http://spam.example' })
      .expect(201);
    expect(await prisma.enquiry.count()).toBe(before);
  });

  it('refuses a request without the CSRF header', async () => {
    await request(app.getHttpServer()).post('/api/enquiries').send(valid).expect(403);
  });

  it('limits sign-ups to 5 a minute from one address', async () => {
    const res = await api(app).post('/api/enquiries').send(valid);
    expect(res.status).toBe(429);
  });

  it('is protected for admin only', async () => {
    await api(app).get('/api/admin/enquiries').expect(401);
    await api(app).get('/api/admin/enquiries/counts').expect(401);
  });

  it('lets the owner list, search, sort, update and delete', async () => {
    const list = await api(app).get('/api/admin/enquiries').set('Cookie', cookie).expect(200);
    expect(list.body.total).toBe(3);
    expect(list.body.items[0]).toHaveProperty('phone');

    const search = await api(app).get('/api/admin/enquiries?q=ayesha').set('Cookie', cookie).expect(200);
    expect(search.body.items.map((e: { name: string }) => e.name)).toEqual(['Ayesha Khan']);

    // soonest wedding first, no date last
    const byEvent = await api(app).get('/api/admin/enquiries?sort=event').set('Cookie', cookie).expect(200);
    expect(byEvent.body.items[0].name).toBe('Ayesha Khan');

    const id = list.body.items.find((e: { name: string }) => e.name === 'Ayesha Khan').id;
    const updated = await api(app)
      .patch(`/api/admin/enquiries/${id}`)
      .set('Cookie', cookie)
      .send({
        status: 'CONTACTED',
        adminNote: ' Called, wants to visit Saturday ',
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      status: 'CONTACTED',
      adminNote: 'Called, wants to visit Saturday',
    });

    const counts = await api(app).get('/api/admin/enquiries/counts').set('Cookie', cookie).expect(200);
    expect(counts.body).toMatchObject({
      NEW: 2,
      CONTACTED: 1,
      BOOKED: 0,
      CLOSED: 0,
      ALL: 3,
    });

    const onlyContacted = await api(app)
      .get('/api/admin/enquiries?status=CONTACTED')
      .set('Cookie', cookie)
      .expect(200);
    expect(onlyContacted.body.total).toBe(1);

    await api(app)
      .patch(`/api/admin/enquiries/${id}`)
      .set('Cookie', cookie)
      .send({ status: 'NOPE' })
      .expect(400);
    await api(app).delete(`/api/admin/enquiries/${id}`).set('Cookie', cookie).expect(200);
    await api(app)
      .patch(`/api/admin/enquiries/${id}`)
      .set('Cookie', cookie)
      .send({ status: 'NEW' })
      .expect(404);
  });
});
