import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { api, createTestApp, CSRF_HEADERS, loginAsAdmin } from './helpers/app.js';

describe('Admin dashboard and customers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  const run = Date.now().toString(36);
  const productIds: string[] = [];

  const admin = {
    get: (url: string) => api(app).get(url).set('Cookie', adminCookie),
    patch: (url: string) => api(app).patch(url).set('Cookie', adminCookie),
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    adminCookie = await loginAsAdmin(app);
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { email: { contains: run } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.customer.deleteMany({ where: { email: { contains: run } } });
    await app.close();
  });

  it('is for the owner only', async () => {
    await api(app).get('/api/admin/dashboard').expect(401);
    await api(app).get('/api/admin/customers').expect(401);
  });

  it('counts a paid order in today, this week and this month, and in the to-do list', async () => {
    const before = (await admin.get('/api/admin/dashboard').expect(200)).body;

    // A product with one piece left, so it shows in "running low"
    const product = await prisma.product.create({
      data: {
        name: `Dash ${run}`,
        slug: `dash-${run}`,
        status: 'ACTIVE',
        price: 30000,
        variants: { create: [{ sku: `DASH-${run}`, size: 'M', colour: 'Ivory', stock: 2 }] },
      },
      select: { id: true, variants: { select: { id: true } } },
    });
    productIds.push(product.id);

    const who = request.agent(app.getHttpServer());
    await who
      .post('/api/cart/items')
      .set(CSRF_HEADERS)
      .send({ variantId: product.variants[0].id, quantity: 1 })
      .expect(201);
    const rates = (await api(app).get('/api/shipping/options?country=AU').expect(200)).body.options;
    const email = `dash.${run}@example.com`;
    const placed = await who
      .post('/api/checkout')
      .set(CSRF_HEADERS)
      .set('Idempotency-Key', `dash-${run}-key`)
      .send({
        email,
        shippingRateId: rates[0].id,
        shippingAddress: {
          fullName: 'Dash Buyer',
          line1: '1 Test St',
          city: 'Sydney',
          postcode: '2000',
          countryCode: 'AU',
        },
      })
      .expect(201);
    const orderNumber = placed.body.order.orderNumber as string;
    const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber } });

    // Waiting for payment: not a sale yet
    const unpaid = (await admin.get('/api/admin/dashboard').expect(200)).body;
    expect(unpaid.today.orders).toBe(before.today.orders);
    expect(unpaid.recentOrders.map((o: { orderNumber: string }) => o.orderNumber)).not.toContain(orderNumber);

    await who
      .post('/api/payments/square')
      .set(CSRF_HEADERS)
      .send({ orderNumber, sourceId: 'fake-card-ok' })
      .expect(200);

    const after = (await admin.get('/api/admin/dashboard').expect(200)).body;
    for (const key of ['today', 'week', 'month'] as const) {
      expect(after[key].orders).toBe(before[key].orders + 1);
      expect(after[key].sales).toEqual({
        amount: before[key].sales.amount + order.totalAud,
        currencyCode: 'AUD',
      });
    }
    expect(after.toDo.toSend).toBe(before.toDo.toSend + 1);
    expect(after.recentOrders[0]).toMatchObject({
      orderNumber,
      shipFullName: 'Dash Buyer',
      status: 'PROCESSING',
    });
    expect(after.lowStock.items.map((v: { sku: string }) => v.sku)).toContain(`DASH-${run}`);
    expect(after.lowStock.limit).toBe(2);

    // A refunded order is no longer counted as a sale
    await api(app)
      .post(`/api/admin/orders/${order.id}/cancel-and-refund`)
      .set('Cookie', adminCookie)
      .send({ reason: 'Dashboard test' })
      .expect(200);
    const refunded = (await admin.get('/api/admin/dashboard').expect(200)).body;
    expect(refunded.today.orders).toBe(before.today.orders);
    expect(refunded.toDo.toSend).toBe(before.toDo.toSend);
  });

  it('lists customers with their order count and total spent, and can switch one off', async () => {
    const email = `cust.${run}@example.com`;
    await api(app)
      .post('/api/auth/register')
      .send({ email, password: 'Mehndi-Night-2026', firstName: 'Zara' })
      .expect(201);
    const list = await admin.get(`/api/admin/customers?q=${encodeURIComponent(`cust.${run}`)}`).expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0]).toMatchObject({
      email,
      firstName: 'Zara',
      hasAccount: true,
      orderCount: 0,
      isActive: true,
    });
    const id = list.body.items[0].id as string;

    const detail = await admin.get(`/api/admin/customers/${id}`).expect(200);
    expect(detail.body).toMatchObject({ email, recentOrders: [], addresses: [] });

    expect(
      (await admin.patch(`/api/admin/customers/${id}`).send({ isActive: false }).expect(200)).body.isActive,
    ).toBe(false);
    // A switched-off customer can't sign in
    await api(app).post('/api/auth/login').send({ email, password: 'Mehndi-Night-2026' }).expect(403);
    expect(
      (await admin.patch(`/api/admin/customers/${id}`).send({ isActive: true }).expect(200)).body.isActive,
    ).toBe(true);
  });
});
