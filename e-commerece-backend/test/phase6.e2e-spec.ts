import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MAIL_SERVICE, type ConsoleMailService } from '../src/modules/mail/mail.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { api, createTestApp, CSRF_HEADERS, loginAsAdmin } from './helpers/app.js';

describe('Phase 6: order emails, reviews and feeds (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mail: ConsoleMailService;
  let adminCookie: string;
  const run = Date.now().toString(36);
  const productIds: string[] = [];
  let originalSettings: {
    sendOrderEmails: boolean;
    sendShippingEmails: boolean;
    autoApproveReviews: boolean;
  };

  const admin = {
    get: (url: string) => api(app).get(url).set('Cookie', adminCookie),
    patch: (url: string) => api(app).patch(url).set('Cookie', adminCookie),
    delete: (url: string) => api(app).delete(url).set('Cookie', adminCookie),
    post: (url: string) => api(app).post(url).set('Cookie', adminCookie),
  };

  async function waitForMail(to: string, subjectPart: string) {
    for (let i = 0; i < 100; i++) {
      const message = mail.lastTo(to);
      if (message?.subject.includes(subjectPart)) return message;
      await new Promise((r) => setTimeout(r, 30));
    }
    return undefined;
  }

  async function newProduct(label: string) {
    const p = await prisma.product.create({
      data: {
        name: `P6 ${label} ${run}`,
        slug: `p6-${label}-${run}`,
        status: 'ACTIVE',
        price: 20000,
        variants: { create: [{ sku: `P6-${label}-${run}`, size: 'M', colour: 'Ivory', stock: 5 }] },
        images: { create: [{ url: 'https://img.example.com/p6.webp' }] },
      },
      select: { id: true, slug: true, variants: { select: { id: true } } },
    });
    productIds.push(p.id);
    return p;
  }

  // Registers and signs in a customer; returns an agent that holds the cookies
  async function signedInCustomer(label: string, firstName: string) {
    const agent = request.agent(app.getHttpServer());
    const email = `p6.${label}.${run}@example.com`;
    const password = 'Mehndi-Night-2026';
    await agent
      .post('/api/auth/register')
      .set(CSRF_HEADERS)
      .send({ email, password, firstName, lastName: 'Khan' })
      .expect(201);
    await agent.post('/api/auth/login').set(CSRF_HEADERS).send({ email, password }).expect(200);
    return { agent, email };
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    mail = app.get(MAIL_SERVICE);
    adminCookie = await loginAsAdmin(app);
    const settings = await prisma.storeSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    originalSettings = {
      sendOrderEmails: settings.sendOrderEmails,
      sendShippingEmails: settings.sendShippingEmails,
      autoApproveReviews: settings.autoApproveReviews,
    };
  });

  afterAll(async () => {
    await prisma.storeSettings.update({
      where: { id: 1 },
      data: { ...originalSettings, emailFooterNote: null },
    });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.customer.deleteMany({ where: { email: { contains: run } } });
    await app.close();
  });

  describe('order emails', () => {
    async function paidOrder(label: string) {
      const product = await newProduct(label);
      const who = request.agent(app.getHttpServer());
      await who
        .post('/api/cart/items')
        .set(CSRF_HEADERS)
        .send({ variantId: product.variants[0].id, quantity: 1 })
        .expect(201);
      const rates = (await api(app).get('/api/shipping/options?country=AU').expect(200)).body.options;
      const email = `p6.buyer.${label}.${run}@example.com`;
      const placed = await who
        .post('/api/checkout')
        .set(CSRF_HEADERS)
        .set('Idempotency-Key', `p6-${label}-${run}`)
        .send({
          email,
          shippingRateId: rates[0].id,
          shippingAddress: {
            fullName: 'Noor Fatima',
            line1: '3 Lily St',
            city: 'Sydney',
            state: 'NSW',
            postcode: '2000',
            countryCode: 'AU',
          },
        })
        .expect(201);
      const orderNumber = placed.body.order.orderNumber as string;
      const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber } });
      await who
        .post('/api/payments/square')
        .set(CSRF_HEADERS)
        .send({ orderNumber, sourceId: 'fake-card-ok' })
        .expect(200);
      return { email, order, orderNumber };
    }

    it('sends a confirmation when the order is paid, and a shipping email when it is shipped', async () => {
      await prisma.storeSettings.update({
        where: { id: 1 },
        data: { sendOrderEmails: true, sendShippingEmails: true, emailFooterNote: 'Open Mon-Sat 10-5' },
      });
      const { email, order, orderNumber } = await paidOrder('mail');

      const confirmation = await waitForMail(email, 'confirmed');
      expect(confirmation?.subject).toBe(`Order ${orderNumber} confirmed`);
      expect(confirmation?.text).toContain('Noor');
      expect(confirmation?.text).toContain('Open Mon-Sat 10-5');
      expect(confirmation?.text).toContain('Australia');

      await admin
        .post(`/api/admin/orders/${order.id}/status`)
        .send({
          status: 'SHIPPED',
          trackingNumber: 'TRK-P6',
          trackingUrl: 'https://track.example.com/TRK-P6',
        })
        .expect(200);
      const shipped = await waitForMail(email, 'has shipped');
      expect(shipped?.text).toContain('Tracking number: TRK-P6');
    });

    it('sends nothing when the owner switches the emails off', async () => {
      await prisma.storeSettings.update({ where: { id: 1 }, data: { sendOrderEmails: false } });
      const { email } = await paidOrder('quiet');
      await new Promise((r) => setTimeout(r, 400));
      expect(mail.lastTo(email)).toBeUndefined();
    });
  });

  describe('reviews', () => {
    it('needs a signed-in customer to write one', async () => {
      const product = await newProduct('rev-auth');
      await api(app)
        .post(`/api/products/${product.slug}/reviews`)
        .send({ rating: 5, body: 'Lovely outfit really' })
        .expect(401);
    });

    it('waits for approval, then shows up with stars; the owner can reply, hide and delete', async () => {
      await prisma.storeSettings.update({ where: { id: 1 }, data: { autoApproveReviews: false } });
      const product = await newProduct('rev');
      const { agent } = await signedInCustomer('reviewer', 'Ayesha');

      // Bad input is refused with a clear message
      const bad = await agent
        .post(`/api/products/${product.slug}/reviews`)
        .set(CSRF_HEADERS)
        .send({ rating: 6, body: 'short' })
        .expect(400);
      expect(JSON.stringify(bad.body.message)).toMatch(/1 to 5 stars/);

      const created = await agent
        .post(`/api/products/${product.slug}/reviews`)
        .set(CSRF_HEADERS)
        .send({
          rating: 4,
          title: '<b>Beautiful</b>',
          body: 'The embroidery is <i>gorgeous</i> and fits well.',
        })
        .expect(201);
      expect(created.body.awaitingApproval).toBe(true);
      expect(created.body.review).toMatchObject({
        authorName: 'Ayesha K.',
        title: 'Beautiful',
        isVerified: false,
      });
      expect(created.body.review.body).not.toMatch(/<i>/);
      // The public never sees the customer's identity
      expect(JSON.stringify(created.body)).not.toMatch(/@example\.com|customerId/);

      // One review per customer per product
      await agent
        .post(`/api/products/${product.slug}/reviews`)
        .set(CSRF_HEADERS)
        .send({ rating: 5, body: 'Trying to review twice.' })
        .expect(409);

      // Not public yet
      let list = await api(app).get(`/api/products/${product.slug}/reviews`).expect(200);
      expect(list.body).toMatchObject({ total: 0, summary: { count: 0, average: null } });

      // Owner sees it as pending and approves it with a reply
      const counts = await admin.get('/api/admin/reviews/counts').expect(200);
      expect(counts.body.PENDING).toBeGreaterThanOrEqual(1);
      const pending = await admin
        .get(`/api/admin/reviews?status=PENDING&q=${encodeURIComponent(`P6 rev ${run}`)}`)
        .expect(200);
      const id = pending.body.items.find(
        (r: { product: { slug: string } }) => r.product.slug === product.slug,
      ).id as string;
      await admin
        .patch(`/api/admin/reviews/${id}`)
        .send({ status: 'APPROVED', shopReply: 'Thank you Ayesha!' })
        .expect(200);

      list = await api(app).get(`/api/products/${product.slug}/reviews`).expect(200);
      expect(list.body.total).toBe(1);
      expect(list.body.items[0]).toMatchObject({ rating: 4, shopReply: 'Thank you Ayesha!' });
      expect(list.body.summary).toEqual({ count: 1, average: 4 });
      const detail = await api(app).get(`/api/products/${product.slug}`).expect(200);
      expect(detail.body.rating).toEqual({ count: 1, average: 4 });

      // Hiding takes the stars away again
      await admin.patch(`/api/admin/reviews/${id}`).send({ status: 'REJECTED' }).expect(200);
      expect((await api(app).get(`/api/products/${product.slug}`).expect(200)).body.rating).toEqual({
        count: 0,
        average: null,
      });

      await admin.delete(`/api/admin/reviews/${id}`).expect(200);
      await admin.patch(`/api/admin/reviews/${id}`).send({ status: 'APPROVED' }).expect(404);
    });

    it('goes live straight away when the owner turns on auto-approve, and marks real buyers as verified', async () => {
      await prisma.storeSettings.update({ where: { id: 1 }, data: { autoApproveReviews: true } });
      const product = await newProduct('rev-auto');
      const { agent, email } = await signedInCustomer('buyer', 'Sara');
      const customer = await prisma.customer.findUniqueOrThrow({ where: { email } });
      await prisma.order.create({
        data: {
          orderNumber: `P6-${run}`,
          status: 'DELIVERED',
          customerId: customer.id,
          email,
          shipFullName: 'Sara Khan',
          shipLine1: '1 Test St',
          shipCity: 'Sydney',
          shipPostcode: '2000',
          shipCountryCode: 'AU',
          currencyCode: 'AUD',
          exchangeRate: 1,
          subtotal: 20000,
          total: 20000,
          totalAud: 20000,
          items: {
            create: [
              {
                variantId: product.variants[0].id,
                productName: 'x',
                sku: 'x',
                unitPrice: 20000,
                quantity: 1,
                lineTotal: 20000,
              },
            ],
          },
        },
      });
      const created = await agent
        .post(`/api/products/${product.slug}/reviews`)
        .set(CSRF_HEADERS)
        .send({ rating: 5, body: "Perfect for my sister's Nikah." })
        .expect(201);
      expect(created.body).toMatchObject({ awaitingApproval: false, review: { isVerified: true } });
      const list = await api(app).get(`/api/products/${product.slug}/reviews`).expect(200);
      expect(list.body.summary).toEqual({ count: 1, average: 5 });
      await prisma.order.delete({ where: { orderNumber: `P6-${run}` } });
    });

    it('is protected for the owner only', async () => {
      await api(app).get('/api/admin/reviews').expect(401);
    });
  });

  describe('feeds', () => {
    it('lists the public pages for the sitemap', async () => {
      const product = await newProduct('feed');
      const res = await api(app).get('/api/feeds/sitemap').expect(200);
      expect(res.body.products.map((p: { slug: string }) => p.slug)).toContain(product.slug);
      expect(res.body.pages.map((p: { slug: string }) => p.slug)).not.toContain('home');
    });

    it('serves the Facebook / Instagram product file as CSV', async () => {
      const product = await newProduct('csv');
      const res = await api(app).get('/api/feeds/meta.csv').expect(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text.split('\n')[0]).toContain('item_group_id');
      expect(res.text).toContain(`/products/${product.slug}`);
      expect(res.text).toContain('200.00 AUD');
    });
  });

  describe('email settings', () => {
    it('can be changed by the owner and are not public', async () => {
      const res = await admin
        .patch('/api/admin/settings')
        .send({ sendShippingEmails: false, emailFooterNote: 'Hi there' })
        .expect(200);
      expect(res.body).toMatchObject({ sendShippingEmails: false, emailFooterNote: 'Hi there' });
      const publicSettings = await api(app).get('/api/settings').expect(200);
      expect(publicSettings.body).not.toHaveProperty('sendShippingEmails');
      expect(publicSettings.body).not.toHaveProperty('emailFooterNote');
      await admin.patch('/api/admin/settings').send({ sendShippingEmails: null }).expect(400);
    });
  });
});
