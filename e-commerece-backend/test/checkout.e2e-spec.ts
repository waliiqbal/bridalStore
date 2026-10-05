import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { OrderLifecycleService } from '../src/modules/orders/order-lifecycle.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { api, createTestApp, CSRF_HEADERS, loginAsAdmin } from './helpers/app.js';

describe('Pricing, checkout & orders (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let lifecycle: OrderLifecycleService;
  let adminCookie: string;
  const run = Date.now().toString(36);
  const createdProducts: string[] = [];
  const createdCoupons: string[] = [];

  // A shopper with their own cookie jar (cart + session cookies persist)
  const shopper = () => {
    const agent = request.agent(app.getHttpServer());
    return {
      get: (url: string) => agent.get(url),
      post: (url: string) => agent.post(url).set(CSRF_HEADERS),
      patch: (url: string) => agent.patch(url).set(CSRF_HEADERS),
      delete: (url: string) => agent.delete(url).set(CSRF_HEADERS),
    };
  };
  const admin = {
    get: (url: string) => api(app).get(url).set('Cookie', adminCookie),
    post: (url: string) => api(app).post(url).set('Cookie', adminCookie),
    patch: (url: string) => api(app).patch(url).set('Cookie', adminCookie),
    delete: (url: string) => api(app).delete(url).set('Cookie', adminCookie),
  };

  // A fresh product with one variant, so stock and sales are predictable
  async function product(name: string, stock: number, price = 10000) {
    const p = await prisma.product.create({
      data: {
        name: `${name} ${run}`,
        slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${run}`,
        status: 'ACTIVE',
        price,
        variants: { create: [{ sku: `E2E-${run}-${createdProducts.length}`, size: 'M', colour: 'Ivory', stock }] },
      },
      select: { id: true, salesCount: true, variants: { select: { id: true } } },
    });
    createdProducts.push(p.id);
    return { id: p.id, variantId: p.variants[0].id };
  }
  const stockOf = async (variantId: string) =>
    (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId }, select: { stock: true } })).stock;
  const ratesFor = async (country: string) =>
    (await api(app).get(`/api/shipping/options?country=${country}`).expect(200)).body.options as { id: string; name: string }[];
  const address = (countryCode: string) => ({
    fullName: 'Hira Ahmed',
    line1: '5 Marigold Lane',
    city: countryCode === 'AU' ? 'Liverpool' : 'Bradford',
    state: countryCode === 'AU' ? 'NSW' : null,
    postcode: countryCode === 'AU' ? '2170' : 'BD1 1AA',
    countryCode,
  });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    lifecycle = app.get(OrderLifecycleService);
    adminCookie = await loginAsAdmin(app);
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: { in: createdProducts } } });
    await prisma.coupon.deleteMany({ where: { id: { in: createdCoupons } } });
    await prisma.customer.deleteMany({ where: { email: { contains: run } } });
    await app.close();
  });

  it('guest checkout in AUD to Australia: GST included, idempotent, paid once, shipped', async () => {
    const item = await product('Rani Pink Lehenga', 5);
    const guest = shopper();
    await guest.post('/api/cart/items').send({ variantId: item.variantId, quantity: 2 }).expect(201);

    // Cart priced for Australia: cheapest rate as an estimate, GST included
    const cart = await guest.get('/api/cart?country=AU').expect(200);
    expect(cart.body.totals).toMatchObject({
      subtotal: { amount: 20000, currencyCode: 'AUD' },
      shipping: { amount: 1500 },
      total: { amount: 21500 },
      tax: { amount: 1955 }, // 21500 × 10/110 = 1954.5 → 1955
    });
    expect(cart.body.tax).toEqual({ status: 'INCLUDED', ratePercent: '10.00' });
    expect(cart.body.shipping).toMatchObject({ country: 'AU', available: true, isEstimate: true });
    // Without a country GST is worked out at checkout
    expect((await guest.get('/api/cart').expect(200)).body.tax.status).toBe('CALCULATED_AT_CHECKOUT');

    const [standard] = await ratesFor('AU');

    // Preview lists everything still missing
    const missing = await guest.post('/api/checkout/preview').send({}).expect(200);
    expect(missing.body.canPlaceOrder).toBe(false);
    expect(missing.body.problems.map((p: { code: string }) => p.code)).toEqual(['ADDRESS_REQUIRED', 'EMAIL_REQUIRED']);

    const body = {
      email: `hira.${run}@example.com`,
      phone: '+61 400 000 001',
      shippingAddress: address('AU'),
      shippingRateId: standard.id,
      currency: 'AUD',
      customerNote: 'Please gift wrap',
    };
    const preview = await guest.post('/api/checkout/preview').send(body).expect(200);
    expect(preview.body).toMatchObject({
      canPlaceOrder: true,
      problems: [],
      paymentMethods: ['SQUARE', 'PAYPAL'],
      totals: { total: { amount: 21500 }, tax: { amount: 1955 } },
    });
    expect(preview.body.shippingOptions[0]).toMatchObject({ id: standard.id, isFree: false, freeOver: { amount: 30000 } });

    await guest.post('/api/checkout').send(body).expect(400); // no Idempotency-Key

    const key = `key-${run}-aud`;
    const placed = await guest.post('/api/checkout').set('Idempotency-Key', key).send(body).expect(201);
    const order = placed.body.order;
    expect(order.orderNumber).toMatch(/^MBS-\d{5,}$/);
    expect(order).toMatchObject({
      status: 'PENDING_PAYMENT',
      email: body.email,
      currencyCode: 'AUD',
      totals: { subtotal: { amount: 20000 }, shipping: { amount: 1500 }, tax: { amount: 1955 }, total: { amount: 21500 } },
      shippingAddress: { fullName: 'Hira Ahmed', countryCode: 'AU' },
      payment: { methods: ['SQUARE', 'PAYPAL'] },
      items: [{ productName: `Rani Pink Lehenga ${run}`, quantity: 2, unitPrice: { amount: 10000 }, lineTotal: { amount: 20000 } }],
    });
    expect(placed.body.paymentMethods).toEqual(['SQUARE', 'PAYPAL']);
    expect(await stockOf(item.variantId)).toBe(3);

    // Same key again (double click / retry) → the same order, nothing new
    const again = await guest.post('/api/checkout').set('Idempotency-Key', key).send(body).expect(200);
    expect(again.body.order.orderNumber).toBe(order.orderNumber);
    expect(await prisma.order.count({ where: { idempotencyKey: key } })).toBe(1);
    expect(await stockOf(item.variantId)).toBe(3);

    // Guest customer created without a password
    const customer = await prisma.customer.findUniqueOrThrow({ where: { email: body.email } });
    expect(customer.passwordHash).toBeNull();

    // Guest order lookup: same answer for a wrong email and a missing order
    const lookup = await api(app).post('/api/orders/lookup').send({ orderNumber: order.orderNumber.toLowerCase(), email: body.email.toUpperCase() }).expect(200);
    expect(lookup.body).not.toHaveProperty('adminNote');
    const wrongEmail = await api(app).post('/api/orders/lookup').send({ orderNumber: order.orderNumber, email: 'x@example.com' }).expect(404);
    const noOrder = await api(app).post('/api/orders/lookup').send({ orderNumber: 'MBS-99999999', email: body.email }).expect(404);
    expect(wrongEmail.body).toEqual(noOrder.body);

    // Payment (phase 6 webhooks call this) — twice
    const id = (await prisma.order.findUniqueOrThrow({ where: { orderNumber: order.orderNumber } })).id;
    const payment = { provider: 'SQUARE' as const, providerPaymentId: `sq_${run}`, amount: 21500, currencyCode: 'AUD' };
    expect((await lifecycle.markPaid(id, payment)).outcome).toBe('PAID');
    expect((await lifecycle.markPaid(id, payment)).outcome).toBe('ALREADY_PAID');
    const paid = await prisma.product.findUniqueOrThrow({ where: { id: item.id }, select: { salesCount: true } });
    expect(paid.salesCount).toBe(2);
    expect(await prisma.payment.count({ where: { orderId: id } })).toBe(1);
    // The bought items left the bag
    expect((await guest.get('/api/cart').expect(200)).body.items).toEqual([]);

    // Admin: find it, ship it (tracking required), deliver it
    const listed = await admin.get(`/api/admin/orders?q=${order.orderNumber}`).expect(200);
    expect(listed.body.items).toEqual([expect.objectContaining({ orderNumber: order.orderNumber, status: 'PROCESSING', itemCount: 2 })]);
    const detail = await admin.get(`/api/admin/orders/${id}`).expect(200);
    expect(detail.body.nextStatuses.map((s: { status: string }) => s.status)).toEqual(['SHIPPED', 'CANCELLED']);
    expect(detail.body.payments).toEqual([expect.objectContaining({ provider: 'SQUARE', status: 'SUCCEEDED' })]);

    const noTracking = await admin.post(`/api/admin/orders/${id}/status`).send({ status: 'SHIPPED' }).expect(400);
    expect(noTracking.body.message).toMatch(/tracking number/);
    await admin.post(`/api/admin/orders/${id}/status`).send({ status: 'DELIVERED' }).expect(400);
    const shipped = await admin
      .post(`/api/admin/orders/${id}/status`)
      .send({ status: 'SHIPPED', trackingNumber: 'AP123456789AU', trackingUrl: 'https://auspost.com.au/track/AP123456789AU' })
      .expect(200);
    expect(shipped.body.order).toMatchObject({ status: 'SHIPPED', trackingNumber: 'AP123456789AU' });
    await admin.post(`/api/admin/orders/${id}/status`).send({ status: 'CANCELLED' }).expect(400);
    await admin.post(`/api/admin/orders/${id}/status`).send({ status: 'DELIVERED' }).expect(200);
    await admin.patch(`/api/admin/orders/${id}`).send({ adminNote: 'Gift wrapped in gold paper' }).expect(200);

    const history = (await admin.get(`/api/admin/orders/${id}`).expect(200)).body.statusHistory;
    expect(history.map((h: { to: string; changedBy: string }) => `${h.to}:${h.changedBy}`)).toEqual([
      'PENDING_PAYMENT:customer',
      'PROCESSING:payment:square',
      `SHIPPED:${process.env.SEED_ADMIN_EMAIL}`,
      `DELIVERED:${process.env.SEED_ADMIN_EMAIL}`,
    ]);

    // Customer totals in admin now include the paid order
    const summary = await admin.get(`/api/admin/customers/${customer.id}`).expect(200);
    expect(summary.body).toMatchObject({ orderCount: 1, totalSpent: { amount: 21500, currencyCode: 'AUD' } });
  });

  it('signed-in checkout in USD to the UK: coupon, no GST, Stripe + PayPal', async () => {
    const item = await product('Emerald Walima Gown', 4);
    const coupon = await admin
      .post('/api/admin/coupons')
      .send({ code: `walima${run}`, type: 'FIXED_AMOUNT', value: 2000, minOrderAmount: 5000, maxUses: 10 })
      .expect(201);
    createdCoupons.push(coupon.body.id);
    expect(coupon.body.code).toBe(`WALIMA${run}`.toUpperCase());

    const customer = shopper();
    await customer.post('/api/auth/register').send({ email: `zara.${run}@example.com`, password: 'Walima-Night-2026' }).expect(201);
    await customer.post('/api/cart/items').send({ variantId: item.variantId }).expect(201);

    const bad = await customer.post('/api/cart/coupon').send({ code: 'NOPE' }).expect(400);
    expect(bad.body.message).toMatch(/isn't valid/);
    const applied = await customer.post('/api/cart/coupon?currency=USD').send({ code: coupon.body.code.toLowerCase() }).expect(200);
    // 2000 AUD × 0.65 = 1300 USD cents
    expect(applied.body.totals.discount).toEqual({ amount: 1300, currencyCode: 'USD' });
    expect(applied.body.coupon).toMatchObject({ code: coupon.body.code, valid: true });

    // Saved address in the UK
    const saved = await customer.post('/api/account/addresses').send(address('GB')).expect(201);
    const [ukStandard] = await ratesFor('GB');
    const placed = await customer
      .post('/api/checkout')
      .set('Idempotency-Key', `key-${run}-usd`)
      .send({ addressId: saved.body.id, shippingRateId: ukStandard.id, currency: 'USD' })
      .expect(201);

    // 10000 AUD → 6500 USD; discount 1300; UK Standard 4500 AUD → 2925 → 3000 USD
    expect(placed.body.order).toMatchObject({
      email: `zara.${run}@example.com`,
      currencyCode: 'USD',
      totals: { subtotal: { amount: 6500 }, discount: { amount: 1300 }, shipping: { amount: 3000 }, tax: { amount: 0 }, total: { amount: 8200 } },
      couponCode: coupon.body.code,
      shippingAddress: { countryCode: 'GB' },
    });
    expect(placed.body.paymentMethods).toEqual(['STRIPE', 'PAYPAL']);

    const dbOrder = await prisma.order.findUniqueOrThrow({ where: { orderNumber: placed.body.order.orderNumber } });
    expect(dbOrder.totalAud).toBe(10000 - 2000 + 4500);
    expect(dbOrder.exchangeRate.toFixed(2)).toBe('0.65');
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.body.id } })).usedCount).toBe(1);

    // Account order history
    const mine = await customer.get('/api/account/orders').expect(200);
    expect(mine.body.items).toEqual([expect.objectContaining({ orderNumber: placed.body.order.orderNumber, status: 'PENDING_PAYMENT' })]);
    const detail = await customer.get(`/api/account/orders/${placed.body.order.orderNumber}`).expect(200);
    expect(detail.body.timeline).toEqual([expect.objectContaining({ status: 'PENDING_PAYMENT', label: 'Waiting for payment' })]);

    // A paid coupon can't be deleted, only switched off
    await admin.delete(`/api/admin/coupons/${coupon.body.id}`).expect(409);

    // Amount mismatch is never marked paid
    const mismatch = await lifecycle.markPaid(dbOrder.id, {
      provider: 'STRIPE',
      providerPaymentId: `pi_wrong_${run}`,
      amount: 100,
      currencyCode: 'USD',
    });
    expect(mismatch.outcome).toBe('AMOUNT_MISMATCH');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: dbOrder.id } })).status).toBe('PENDING_PAYMENT');
  });

  it('two shoppers race for the last unit: exactly one order succeeds', async () => {
    const item = await product('Last Gharara', 1);
    const [a, b] = [shopper(), shopper()];
    await a.post('/api/cart/items').send({ variantId: item.variantId }).expect(201);
    await b.post('/api/cart/items').send({ variantId: item.variantId }).expect(201);
    const [rate] = await ratesFor('AU');
    const body = (who: string) => ({
      email: `${who}.${run}@example.com`,
      shippingAddress: address('AU'),
      shippingRateId: rate.id,
    });

    const results = await Promise.all([
      a.post('/api/checkout').set('Idempotency-Key', `race-a-${run}`).send(body('race-a')),
      b.post('/api/checkout').set('Idempotency-Key', `race-b-${run}`).send(body('race-b')),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const loser = results.find((r) => r.status === 409)!;
    expect(loser.body.problems[0].code).toMatch(/OUT_OF_STOCK/);
    expect(await stockOf(item.variantId)).toBe(0);
    expect(await prisma.orderItem.count({ where: { variantId: item.variantId } })).toBe(1);
  });

  it('expired reservations return stock and coupon uses; re-checkout replaces the older order', async () => {
    const item = await product('Ivory Nikah Set', 3);
    const coupon = await admin.post('/api/admin/coupons').send({ code: `NIKAH${run}`, type: 'PERCENTAGE', value: 10, maxUses: 1 }).expect(201);
    createdCoupons.push(coupon.body.id);
    const guest = shopper();
    await guest.post('/api/cart/items').send({ variantId: item.variantId }).expect(201);
    await guest.post('/api/cart/coupon').send({ code: coupon.body.code }).expect(200);
    const [rate] = await ratesFor('AU');
    const body = { email: `amal.${run}@example.com`, shippingAddress: address('AU'), shippingRateId: rate.id };

    const first = await guest.post('/api/checkout').set('Idempotency-Key', `exp-1-${run}`).send(body).expect(201);
    expect(await stockOf(item.variantId)).toBe(2);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.body.id } })).usedCount).toBe(1);

    // Same bag checks out again: the older pending order is cancelled first
    const second = await guest.post('/api/checkout').set('Idempotency-Key', `exp-2-${run}`).send(body).expect(201);
    const firstOrder = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: first.body.order.orderNumber },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    expect(firstOrder.status).toBe('CANCELLED');
    expect(firstOrder.statusHistory.at(-1)?.changedBy).toBe('system:replaced-by-new-checkout');
    expect(await stockOf(item.variantId)).toBe(2);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.body.id } })).usedCount).toBe(1);

    // The hold runs out
    const secondId = (await prisma.order.findUniqueOrThrow({ where: { orderNumber: second.body.order.orderNumber } })).id;
    await prisma.order.update({ where: { id: secondId }, data: { reservationExpiresAt: new Date(Date.now() - 1000) } });
    const released = await lifecycle.releaseExpiredReservations();
    expect(released.orderNumbers).toContain(second.body.order.orderNumber);
    expect(await stockOf(item.variantId)).toBe(3);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.body.id } })).usedCount).toBe(0);
    expect((await lifecycle.releaseExpiredReservations()).orderNumbers).not.toContain(second.body.order.orderNumber);

    // A late payment revives it while stock remains
    const late = await lifecycle.markPaid(secondId, {
      provider: 'PAYPAL',
      providerPaymentId: `pp_${run}`,
      amount: second.body.order.totals.total.amount,
      currencyCode: 'AUD',
    });
    expect(late.outcome).toBe('PAID');
    expect(await stockOf(item.variantId)).toBe(2);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: secondId } })).status).toBe('PROCESSING');

    // A second, different payment for the same order needs a refund
    const double = await lifecycle.markPaid(secondId, {
      provider: 'PAYPAL',
      providerPaymentId: `pp_again_${run}`,
      amount: second.body.order.totals.total.amount,
      currencyCode: 'AUD',
    });
    expect(double.outcome).toBe('NEEDS_REFUND');

    // Admin cancels the paid order: stock back, refund flagged
    const cancelled = await admin.post(`/api/admin/orders/${secondId}/status`).send({ status: 'CANCELLED', note: 'Customer changed her mind' }).expect(200);
    expect(cancelled.body.refundRequired).toBe(true);
    expect(await stockOf(item.variantId)).toBe(3);
  });

  it('admin settings for currencies and shipping zones protect the basics', async () => {
    await admin.patch('/api/admin/currencies/AUD').send({ rateFromAud: '1.2' }).expect(400);
    await admin.patch('/api/admin/currencies/AUD').send({ isEnabled: false }).expect(400);
    await admin.delete('/api/admin/currencies/AUD').expect(400);
    const usd = await admin.patch('/api/admin/currencies/usd').send({ rateFromAud: 0.65 }).expect(200);
    expect(usd.body).toMatchObject({ code: 'USD', rateFromAud: '0.650000' });

    const zones = (await admin.get('/api/admin/shipping/zones').expect(200)).body;
    expect(zones.find((z: { isFallback: boolean }) => z.isFallback)).toBeTruthy();
    const clash = await admin.post('/api/admin/shipping/zones').send({ name: `Oceania ${run}`, countryCodes: ['NZ', 'FJ'] }).expect(409);
    expect(clash.body.message).toMatch(/NZ already in/);
    await admin.post('/api/admin/shipping/zones').send({ name: `World 2 ${run}`, isFallback: true }).expect(409);
    const zone = await admin.post('/api/admin/shipping/zones').send({ name: `Pacific ${run}`, countryCodes: ['fj', 'WS'] }).expect(201);
    expect(zone.body.countryCodes).toEqual(['FJ', 'WS']);
    const rate = await admin.post(`/api/admin/shipping/zones/${zone.body.id}/rates`).send({ name: 'Express', price: 5500, estimatedDays: '5–8 days' }).expect(201);
    const fiji = await api(app).get('/api/shipping/options?country=FJ&currency=NZD').expect(200);
    expect(fiji.body).toMatchObject({ available: true, zone: { name: `Pacific ${run}` }, options: [{ id: rate.body.id, price: { currencyCode: 'NZD' } }] });
    await admin.delete(`/api/admin/shipping/zones/${zone.body.id}`).expect(200);
  });
});
