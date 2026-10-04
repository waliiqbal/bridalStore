import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { FAKE_DECLINED_CARD, type FakeAdapter } from '../src/modules/payments/providers/fake.adapter.js';
import { PAYMENT_ADAPTERS, type PaymentAdapters, type WebhookOutcome } from '../src/modules/payments/providers/provider.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { api, createTestApp, CSRF_HEADERS, loginAsAdmin } from './helpers/app.js';

describe('Payments, webhooks & refunds (e2e, fake provider)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fakes: Record<'STRIPE' | 'SQUARE' | 'PAYPAL', FakeAdapter>;
  let adminCookie: string;
  const run = Date.now().toString(36);
  const products: string[] = [];
  let seq = 0;

  const shopper = () => {
    const agent = request.agent(app.getHttpServer());
    return {
      get: (url: string) => agent.get(url),
      post: (url: string) => agent.post(url).set(CSRF_HEADERS),
    };
  };
  const admin = {
    get: (url: string) => api(app).get(url).set('Cookie', adminCookie),
    post: (url: string) => api(app).post(url).set('Cookie', adminCookie),
  };

  // Places an unpaid order for a fresh product; returns the shopper who owns it.
  async function placeOrder(currency: 'AUD' | 'USD', quantity = 1) {
    const p = await prisma.product.create({
      data: {
        name: `Pay Test ${run} ${++seq}`,
        slug: `pay-test-${run}-${seq}`,
        status: 'ACTIVE',
        price: 10000,
        variants: { create: [{ sku: `PAY-${run}-${seq}`, size: 'M', colour: 'Ivory', stock: 5 }] },
      },
      select: { id: true, variants: { select: { id: true } } },
    });
    products.push(p.id);
    const who = shopper();
    await who.post('/api/cart/items').send({ variantId: p.variants[0].id, quantity }).expect(201);
    const country = currency === 'AUD' ? 'AU' : 'GB';
    const rates = (await api(app).get(`/api/shipping/options?country=${country}`).expect(200)).body.options;
    const placed = await who
      .post('/api/checkout')
      .set('Idempotency-Key', `pay-${run}-${seq}`)
      .send({
        email: `payer.${run}.${seq}@example.com`,
        currency,
        shippingRateId: rates[0].id,
        shippingAddress: { fullName: 'Noor Fatima', line1: '3 Lily St', city: 'Sydney', postcode: '2000', countryCode: country },
      })
      .expect(201);
    const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber: placed.body.order.orderNumber } });
    return { who, order, productId: p.id, variantId: p.variants[0].id, paymentMethods: placed.body.paymentMethods as string[] };
  }

  const webhook = (provider: 'stripe' | 'square' | 'paypal', outcome: WebhookOutcome) => {
    const { body, headers } = fakes[provider.toUpperCase() as 'STRIPE'].webhook(outcome);
    return api(app).post(`/api/webhooks/${provider}`).set(headers).send(body);
  };
  const orderOf = (id: string) =>
    prisma.order.findUniqueOrThrow({ where: { id }, include: { statusHistory: true, payments: { include: { refunds: true } } } });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    fakes = app.get<PaymentAdapters>(PAYMENT_ADAPTERS) as typeof fakes;
    adminCookie = await loginAsAdmin(app);
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: { in: products } } });
    await prisma.customer.deleteMany({ where: { email: { contains: run } } });
    await app.close();
  });

  it('Stripe: pay → signed webhook → PROCESSING and bag emptied; the same webhook twice changes nothing more', async () => {
    const config = await api(app).get('/api/payments/config').expect(200);
    expect(config.body).toMatchObject({ driver: 'fake', stripe: { publishableKey: 'pk_test_fake' } });
    expect(JSON.stringify(config.body)).not.toMatch(/secret|sk_|whsec/i);

    const { who, order } = await placeOrder('USD', 2);
    // Routing is enforced on the server
    await who.post('/api/payments/square').send({ orderNumber: order.orderNumber, sourceId: 'cnon:x' }).expect(400);
    // Only the browser that placed the order can pay it
    await shopper().post('/api/payments/stripe/intent').send({ orderNumber: order.orderNumber }).expect(404);

    const intent = await who.post('/api/payments/stripe/intent').send({ orderNumber: order.orderNumber }).expect(200);
    expect(intent.body).toMatchObject({ orderNumber: order.orderNumber, amount: { amount: order.total, currencyCode: 'USD' } });
    expect(intent.body.clientSecret).toMatch(/_secret_fake$/);
    const attempt = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
    expect(attempt).toMatchObject({ status: 'PENDING', provider: 'STRIPE', amount: order.total });

    // The browser alone can't make it paid
    expect((await who.post(`/api/payments/${order.orderNumber}/confirm`).expect(200)).body.paid).toBe(false);

    fakes.STRIPE.complete(attempt.providerPaymentId!);
    const event: WebhookOutcome = {
      kind: 'payment',
      eventId: `evt_${run}_1`,
      type: 'payment_intent.succeeded',
      providerPaymentId: attempt.providerPaymentId!,
      status: 'SUCCEEDED',
      amount: order.total,
      currencyCode: 'USD',
    };
    expect((await webhook('stripe', event).expect(200)).body).toEqual({ received: true, duplicate: false });
    expect((await webhook('stripe', event).expect(200)).body).toEqual({ received: true, duplicate: true });

    const paid = await orderOf(order.id);
    expect(paid.status).toBe('PROCESSING');
    expect(paid.statusHistory.filter((h) => h.to === 'PROCESSING')).toHaveLength(1);
    expect(paid.payments).toEqual([expect.objectContaining({ status: 'SUCCEEDED', rawResponse: null })]);
    expect((await who.get('/api/cart').expect(200)).body.items).toEqual([]);
    expect(await prisma.webhookEvent.count({ where: { eventId: `evt_${run}_1`, processedAt: { not: null } } })).toBe(1);

    // Tampered or unsigned webhooks are rejected
    const { body } = fakes.STRIPE.webhook({ ...event, eventId: `evt_${run}_forged` });
    await api(app).post('/api/webhooks/stripe').set({ 'content-type': 'application/json', 'x-fake-signature': 'forged' }).send(body).expect(400);
    // Webhooks don't need the CSRF header, but nothing else gets that exemption
    await request(app.getHttpServer()).post('/api/payments/stripe/intent').send({ orderNumber: order.orderNumber }).expect(403);
  });

  it('Square: a declined card leaves the order payable; retry succeeds; amount mismatches are flagged, never paid', async () => {
    const { who, order, paymentMethods } = await placeOrder('AUD');
    expect(paymentMethods).toEqual(['SQUARE', 'PAYPAL']);

    const declined = await who.post('/api/payments/square').send({ orderNumber: order.orderNumber, sourceId: FAKE_DECLINED_CARD }).expect(402);
    expect(declined.body.message).toMatch(/declined/);
    expect((await orderOf(order.id)).status).toBe('PENDING_PAYMENT');

    const ok = await who.post('/api/payments/square').send({ orderNumber: order.orderNumber, sourceId: 'cnon:card-ok' }).expect(200);
    expect(ok.body).toMatchObject({ paid: true, status: 'PROCESSING' });
    const after = await orderOf(order.id);
    expect(after.payments.map((p) => p.status).sort()).toEqual(['FAILED', 'SUCCEEDED']);
    // Paying again is refused
    await who.post('/api/payments/square').send({ orderNumber: order.orderNumber, sourceId: 'cnon:card-ok' }).expect(409);

    // Mismatch: the provider reports a different amount
    const other = await placeOrder('USD');
    await other.who.post('/api/payments/stripe/intent').send({ orderNumber: other.order.orderNumber }).expect(200);
    const pi = (await prisma.payment.findFirstOrThrow({ where: { orderId: other.order.id } })).providerPaymentId!;
    fakes.STRIPE.complete(pi, { amount: 100 });
    const confirmed = await other.who.post(`/api/payments/${other.order.orderNumber}/confirm`).expect(200);
    expect(confirmed.body.paid).toBe(false);
    const flagged = await orderOf(other.order.id);
    expect(flagged.status).toBe('PENDING_PAYMENT');
    expect(flagged.attentionNote).toMatch(/does not match the order/);
    const list = await admin.get('/api/admin/orders?needsAttention=true').expect(200);
    expect(list.body.items.map((o: { orderNumber: string }) => o.orderNumber)).toContain(other.order.orderNumber);
  });

  it('confirm and webhook racing → paid once; a second payment is refunded automatically and flagged', async () => {
    const { who, order, productId } = await placeOrder('USD');
    // Tab 1 starts a Stripe payment, tab 2 pays with PayPal
    await who.post('/api/payments/stripe/intent').send({ orderNumber: order.orderNumber }).expect(200);
    const pp = await who.post('/api/payments/paypal/order').send({ orderNumber: order.orderNumber }).expect(200);
    fakes.PAYPAL.complete(pp.body.paypalOrderId); // shopper approves in PayPal

    // Capture, confirm and the capture webhook all at once
    const [capture, confirm] = await Promise.all([
      who.post('/api/payments/paypal/capture').send({ orderNumber: order.orderNumber, paypalOrderId: pp.body.paypalOrderId }),
      who.post(`/api/payments/${order.orderNumber}/confirm`),
    ]);
    expect([capture.status, confirm.status]).toEqual([200, 200]);
    const state = await fakes.PAYPAL.getStatus(pp.body.paypalOrderId);
    await webhook('paypal', {
      kind: 'payment',
      eventId: `pp_evt_${run}`,
      type: 'PAYMENT.CAPTURE.COMPLETED',
      providerPaymentId: pp.body.paypalOrderId,
      captureId: state.captureId,
      status: 'SUCCEEDED',
      amount: order.total,
      currencyCode: 'USD',
    }).expect(200);

    let current = await orderOf(order.id);
    expect(current.status).toBe('PROCESSING');
    expect(current.statusHistory.filter((h) => h.to === 'PROCESSING')).toHaveLength(1);
    expect(current.payments.filter((p) => p.status === 'SUCCEEDED')).toHaveLength(1);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).salesCount).toBe(1);

    // Now tab 1's Stripe payment also goes through → refunded automatically
    const stripeAttempt = current.payments.find((p) => p.provider === 'STRIPE')!;
    fakes.STRIPE.complete(stripeAttempt.providerPaymentId!);
    await webhook('stripe', {
      kind: 'payment',
      eventId: `evt_${run}_dup`,
      type: 'payment_intent.succeeded',
      providerPaymentId: stripeAttempt.providerPaymentId!,
      status: 'SUCCEEDED',
      amount: order.total,
      currencyCode: 'USD',
    }).expect(200);

    current = await orderOf(order.id);
    expect(current.status).toBe('PROCESSING');
    const stripe = current.payments.find((p) => p.provider === 'STRIPE')!;
    expect(stripe.status).toBe('REFUNDED');
    expect(stripe.refunds).toEqual([expect.objectContaining({ amount: order.total, status: 'SUCCEEDED', createdBy: 'system:auto-refund' })]);
    expect(current.attentionNote).toMatch(/refunded automatically/);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).salesCount).toBe(1);
  });

  it('admin refunds: partial, then the rest; never more than paid; refund webhooks are idempotent', async () => {
    const { who, order } = await placeOrder('AUD');
    await who.post('/api/payments/square').send({ orderNumber: order.orderNumber, sourceId: 'cnon:ok' }).expect(200);

    const partial = await admin.post(`/api/admin/orders/${order.id}/refund`).send({ amount: 5000, reason: 'Missing dupatta' }).expect(200);
    expect(partial.body.refund).toMatchObject({ status: 'SUCCEEDED', amount: { amount: 5000, currencyCode: 'AUD' } });
    expect(partial.body.order).toMatchObject({ status: 'PROCESSING', refundable: { amount: order.total - 5000 } });
    expect(partial.body.order.payments[0].refunds[0]).toMatchObject({ providerRefundId: expect.stringMatching(/^fake_refund_/) });
    expect(partial.body.order.statusHistory.at(-1).note).toBe('Refunded AUD 50.00: Missing dupatta');

    const tooMuch = await admin.post(`/api/admin/orders/${order.id}/refund`).send({ amount: order.total, reason: 'Oops' }).expect(400);
    expect(tooMuch.body.message).toMatch(/at most AUD/);

    // The rest, with the provider confirming later by webhook (twice)
    fakes.SQUARE.nextRefundStatus = 'PENDING';
    const rest = await admin.post(`/api/admin/orders/${order.id}/refund`).send({ reason: 'Customer returned the outfit' }).expect(200);
    fakes.SQUARE.nextRefundStatus = 'SUCCEEDED';
    expect(rest.body.refund).toMatchObject({ status: 'PENDING', amount: { amount: order.total - 5000 } });
    expect((await orderOf(order.id)).status).toBe('PROCESSING');
    // Pending refunds already count: nothing more can be refunded
    await admin.post(`/api/admin/orders/${order.id}/refund`).send({ amount: 1, reason: 'x again' }).expect(400);

    const refundEvent: WebhookOutcome = {
      kind: 'refund',
      eventId: `sq_refund_${run}`,
      type: 'refund.updated',
      providerRefundId: rest.body.refund.providerRefundId,
      status: 'SUCCEEDED',
    };
    await webhook('square', refundEvent).expect(200);
    await webhook('square', { ...refundEvent, eventId: `sq_refund_${run}_redelivered` }).expect(200);

    const done = await orderOf(order.id);
    expect(done.status).toBe('REFUNDED');
    expect(done.payments[0].status).toBe('REFUNDED');
    expect(done.statusHistory.filter((h) => h.to === 'REFUNDED')).toHaveLength(1);
    await admin.post(`/api/admin/orders/${order.id}/refund`).send({ reason: 'again' }).expect(400);
  });

  it('cancel and refund a paid order in one action; expired holds can no longer be paid', async () => {
    const { who, order, variantId } = await placeOrder('AUD', 2);
    await who.post('/api/payments/square').send({ orderNumber: order.orderNumber, sourceId: 'cnon:ok' }).expect(200);
    const stockBefore = (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock;

    const res = await admin.post(`/api/admin/orders/${order.id}/cancel-and-refund`).send({ reason: 'Fabric out of stock at the mill' }).expect(200);
    expect(res.body.refund).toMatchObject({ status: 'SUCCEEDED', amount: { amount: order.total } });
    expect(res.body.order.status).toBe('REFUNDED');
    expect(res.body.order.statusHistory.map((h: { to: string }) => h.to)).toEqual(['PENDING_PAYMENT', 'PROCESSING', 'CANCELLED', 'REFUNDED']);
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(stockBefore + 2);

    const late = await placeOrder('AUD');
    await prisma.order.update({ where: { id: late.order.id }, data: { reservationExpiresAt: new Date(Date.now() - 1000) } });
    const expired = await late.who.post('/api/payments/square').send({ orderNumber: late.order.orderNumber, sourceId: 'cnon:ok' }).expect(409);
    expect(expired.body.message).toMatch(/30 minutes/);
  });
});
