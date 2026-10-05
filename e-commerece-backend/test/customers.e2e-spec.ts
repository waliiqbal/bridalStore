import type { INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import { MAIL_SERVICE, type ConsoleMailService } from '../src/modules/mail/mail.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { api, createTestApp, loginAsAdmin } from './helpers/app.js';

// "name=value" from a response's Set-Cookie, '' if it was cleared, undefined if not set.
function cookie(res: Response, name: string): string | undefined {
  const all = (res.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
  const raw = all.find((c) => c.startsWith(`${name}=`));
  if (raw === undefined) return undefined;
  const pair = raw.split(';')[0];
  return pair === `${name}=` ? '' : pair;
}
const value = (pair: string) => pair.split('=').slice(1).join('=');

describe('Customer accounts, wishlist & cart (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mail: ConsoleMailService;
  let adminCookie: string;
  const run = Date.now().toString(36);
  const email = `amina.${run}@example.com`;
  const password = 'Mehndi-Night-2026';

  // Two purchasable variants from the seed (stock 2–5)
  let variantA: { id: string; stock: number };
  let variantB: { id: string; stock: number };

  const http = () => api(app);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    mail = app.get(MAIL_SERVICE);
    adminCookie = await loginAsAdmin(app);
    const variants = await prisma.productVariant.findMany({
      where: { isActive: true, stock: { gte: 3 }, product: { status: 'ACTIVE' } },
      select: { id: true, stock: true },
      orderBy: { sku: 'asc' },
      take: 2,
    });
    [variantA, variantB] = variants;
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({ where: { email: { contains: run } } });
    await app.close();
  });

  // Emails are sent in the background; wait for one sent after `since`.
  async function waitForMail(to: string, subject: string, since = new Date(0)) {
    for (let i = 0; i < 50; i++) {
      const message = mail.lastTo(to);
      if (message?.subject === subject && message.sentAt >= since) return message;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error(`No "${subject}" email to ${to}`);
  }
  const tokenFrom = (text: string) => /token=([A-Za-z0-9_-]+)/.exec(text)![1];

  it('requires the X-Requested-With header on state-changing requests (CSRF)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(403);
    expect(res.body.message).toMatch(/X-Requested-With/);
    // Reads don't need it
    await request(app.getHttpServer()).get('/api/cart').expect(200);
  });

  it('registers, rejects a duplicate, and merges the guest cart on login', async () => {
    const registered = await http()
      .post('/api/auth/register')
      .send({ email: email.toUpperCase(), password, firstName: 'Amina' })
      .expect(201);
    expect(registered.body).toMatchObject({ status: 'CREATED', customer: { email, firstName: 'Amina' } });
    expect(registered.body.customer).not.toHaveProperty('passwordHash');
    const session = cookie(registered, 'customer_token')!;
    expect(session).toBeTruthy();

    const duplicate = await http().post('/api/auth/register').send({ email, password }).expect(409);
    expect(duplicate.body.message).toMatch(/already exists/);

    // Signed in: put 1 × A in the customer's own cart
    const own = await http()
      .post('/api/cart/items')
      .set('Cookie', session)
      .send({ variantId: variantA.id, quantity: 1 })
      .expect(201);
    expect(own.body.items).toHaveLength(1);

    // Guest on another device: 2 × A and 1 × B
    const guestAdd = await http().post('/api/cart/items').send({ variantId: variantA.id, quantity: 2 }).expect(201);
    const guestCart = cookie(guestAdd, 'cart_token')!;
    expect(guestCart).toBeTruthy();
    await http()
      .post('/api/cart/items')
      .set('Cookie', guestCart)
      .send({ variantId: variantB.id })
      .expect(201);
    const guestView = await http().get('/api/cart').set('Cookie', guestCart).expect(200);
    expect(guestView.body.itemCount).toBe(3);

    // Logging in on that device merges the guest bag into the customer's
    const login = await http()
      .post('/api/auth/login')
      .set('Cookie', guestCart)
      .send({ email, password })
      .expect(200);
    const customerSession = cookie(login, 'customer_token')!;
    const mergedCartCookie = cookie(login, 'cart_token')!;
    expect(value(mergedCartCookie)).not.toBe(value(guestCart));
    expect(await prisma.cart.count({ where: { token: value(guestCart) } })).toBe(0);

    const merged = await http().get('/api/cart').set('Cookie', customerSession).expect(200);
    const quantities = Object.fromEntries(
      merged.body.items.map((i: { variantId: string; quantity: number }) => [i.variantId, i.quantity]),
    );
    expect(quantities).toEqual({ [variantA.id]: Math.min(3, variantA.stock), [variantB.id]: 1 });
    expect(merged.body).toMatchObject({ canCheckout: true, coupon: null, totals: { shipping: null, tax: null } });
    expect(merged.body.totals.subtotal.amount).toBe(
      merged.body.items.reduce((sum: number, i: { lineTotal: { amount: number } }) => sum + i.lineTotal.amount, 0),
    );

    // Out of stock: the line stays, flagged, out of the subtotal; checkout blocked
    await prisma.productVariant.update({ where: { id: variantB.id }, data: { stock: 0 } });
    try {
      const soldOut = await http().get('/api/cart?currency=USD').set('Cookie', customerSession).expect(200);
      const lineB = soldOut.body.items.find((i: { variantId: string }) => i.variantId === variantB.id);
      expect(lineB).toMatchObject({ status: 'OUT_OF_STOCK', availableQuantity: 0, quantity: 1 });
      expect(lineB.message).toMatch(/Sold out/);
      expect(soldOut.body.canCheckout).toBe(false);
      expect(soldOut.body.currencyCode).toBe('USD');
      const lineA = soldOut.body.items.find((i: { variantId: string }) => i.variantId === variantA.id);
      expect(soldOut.body.totals.subtotal).toEqual(lineA.lineTotal);
      // Adding a sold-out size is refused with a clear message
      const refused = await http()
        .post('/api/cart/items')
        .set('Cookie', customerSession)
        .send({ variantId: variantB.id })
        .expect(409);
      expect(refused.body.message).toBe('Sorry, this size is sold out');
    } finally {
      await prisma.productVariant.update({ where: { id: variantB.id }, data: { stock: variantB.stock } });
    }

    // Quantity is capped by stock, with a notice; above 10 is rejected
    const lineA = merged.body.items.find((i: { variantId: string }) => i.variantId === variantA.id);
    const capped = await http()
      .patch(`/api/cart/items/${lineA.id}`)
      .set('Cookie', customerSession)
      .send({ quantity: 10 })
      .expect(200);
    expect(capped.body.items.find((i: { id: string }) => i.id === lineA.id).quantity).toBe(variantA.stock);
    expect(capped.body.notice).toBe(`Only ${variantA.stock} available. We've added the maximum to your bag.`);
    await http().patch(`/api/cart/items/${lineA.id}`).set('Cookie', customerSession).send({ quantity: 11 }).expect(400);

    // Someone else's line can't be touched
    await http().delete(`/api/cart/items/${lineA.id}`).expect(404);

    // Logout clears both cookies
    const logout = await http().post('/api/auth/logout').set('Cookie', customerSession).expect(200);
    expect(cookie(logout, 'customer_token')).toBe('');
    expect(cookie(logout, 'cart_token')).toBe('');
  });

  it('never accepts an admin cookie on customer routes, or the reverse', async () => {
    const login = await http().post('/api/auth/login').send({ email, password }).expect(200);
    const customerSession = cookie(login, 'customer_token')!;
    const adminToken = value(adminCookie);
    const customerToken = value(customerSession);

    await http().get('/api/auth/me').set('Cookie', adminCookie).expect(401);
    await http().get('/api/account/profile').set('Cookie', adminCookie).expect(401);
    await http().get('/api/admin/customers').set('Cookie', customerSession).expect(401);
    // Even with the cookie names swapped, the signatures don't match
    await http().get('/api/auth/me').set('Cookie', `customer_token=${adminToken}`).expect(401);
    await http().get('/api/admin/auth/me').set('Cookie', `admin_token=${customerToken}`).expect(401);
    // Sanity: each works on its own side
    await http().get('/api/auth/me').set('Cookie', customerSession).expect(200);
    await http().get('/api/admin/auth/me').set('Cookie', adminCookie).expect(200);
  });

  it('resets a password through an emailed single-use link and signs out old sessions', async () => {
    const login = await http().post('/api/auth/login').send({ email, password }).expect(200);
    const oldSession = cookie(login, 'customer_token')!;

    const known = await http().post('/api/auth/forgot-password').send({ email }).expect(200);
    const unknown = await http()
      .post('/api/auth/forgot-password')
      .send({ email: `nobody.${run}@example.com` })
      .expect(200);
    expect(unknown.body).toEqual(known.body);

    const message = await waitForMail(email, 'Reset your password');
    expect(message.text).toContain('http://localhost:3001/account/reset-password?token=');
    const token = tokenFrom(message.text);
    // Only a hash is stored
    expect(await prisma.passwordResetToken.count({ where: { tokenHash: token } })).toBe(0);

    const newPassword = 'Barat-Day-Gold-77';
    await http().post('/api/auth/reset-password').send({ token, password: newPassword }).expect(200);
    const reused = await http().post('/api/auth/reset-password').send({ token, password: 'Another-pass-1' }).expect(400);
    expect(reused.body.message).toMatch(/invalid or has expired/);

    await http().get('/api/auth/me').set('Cookie', oldSession).expect(401);
    await http().post('/api/auth/login').send({ email, password }).expect(401);
    await http().post('/api/auth/login').send({ email, password: newPassword }).expect(200);

    // Expired tokens are rejected
    const requestedAt = new Date();
    await http().post('/api/auth/forgot-password').send({ email }).expect(200);
    const second = tokenFrom((await waitForMail(email, 'Reset your password', requestedAt)).text);
    expect(second).not.toBe(token);
    await prisma.passwordResetToken.updateMany({
      where: { customer: { email } },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await http().post('/api/auth/reset-password').send({ token: second, password: newPassword }).expect(400);

    // Rate limited after 3 requests a minute
    const res = await http().post('/api/auth/forgot-password').send({ email });
    expect(res.status).toBe(429);
  });

  it('lets a guest-checkout customer claim their account only via an emailed link, keeping orders', async () => {
    const guestEmail = `guest.${run}@example.com`;
    const guest = await prisma.customer.create({ data: { email: guestEmail, firstName: 'Sana' } });
    await prisma.order.create({
      data: {
        orderNumber: `MBS-E2E-${run}`,
        status: 'DELIVERED',
        customerId: guest.id,
        email: guestEmail,
        shipFullName: 'Sana',
        shipLine1: '1 Test St',
        shipCity: 'Sydney',
        shipPostcode: '2000',
        shipCountryCode: 'AU',
        currencyCode: 'AUD',
        exchangeRate: 1,
        subtotal: 49900,
        total: 49900,
        totalAud: 49900,
      },
    });

    // Guest has no password: login looks like an unknown email
    await http().post('/api/auth/login').send({ email: guestEmail, password: 'anything-123' }).expect(401);

    // Register does NOT sign in; it emails a link instead
    const res = await http().post('/api/auth/register').send({ email: guestEmail, password: 'Attacker-guess-1' }).expect(202);
    expect(res.body.status).toBe('CHECK_EMAIL');
    expect(cookie(res, 'customer_token')).toBeUndefined();
    await http().post('/api/auth/login').send({ email: guestEmail, password: 'Attacker-guess-1' }).expect(401);

    const message = await waitForMail(guestEmail, 'Finish creating your account');
    expect(message.text).toContain('/account/set-password?token=');
    await http()
      .post('/api/auth/reset-password')
      .send({ token: tokenFrom(message.text), password: 'Walima-Evening-9' })
      .expect(200);
    await http().post('/api/auth/login').send({ email: guestEmail, password: 'Walima-Evening-9' }).expect(200);

    const detail = await http().get(`/api/admin/customers/${guest.id}`).set('Cookie', adminCookie).expect(200);
    expect(detail.body).toMatchObject({
      hasAccount: true,
      orderCount: 1,
      totalSpent: { amount: 49900, currencyCode: 'AUD' },
      recentOrders: [{ orderNumber: `MBS-E2E-${run}`, total: { amount: 49900, currencyCode: 'AUD' } }],
    });
    expect(detail.body).not.toHaveProperty('passwordHash');
  });

  it('manages profile, addresses and wishlist', async () => {
    const accountEmail = `fatima.${run}@example.com`;
    const reg = await http().post('/api/auth/register').send({ email: accountEmail, password }).expect(201);
    const session = cookie(reg, 'customer_token')!;
    const as = {
      get: (url: string) => http().get(url).set('Cookie', session),
      post: (url: string) => http().post(url).set('Cookie', session),
      patch: (url: string) => http().patch(url).set('Cookie', session),
      delete: (url: string) => http().delete(url).set('Cookie', session),
    };

    const profile = await as.patch('/api/account/profile').send({ firstName: ' Fatima ', phone: '+61 400 111 222', marketingOptIn: true }).expect(200);
    expect(profile.body.customer).toMatchObject({ firstName: 'Fatima', phone: '+61 400 111 222', marketingOptIn: true });

    // Password change keeps this device signed in
    const changed = await as.post('/api/account/password').send({ currentPassword: 'wrong', newPassword: 'Nikah-Lights-55' }).expect(400);
    expect(changed.body.message).toMatch(/current password/);
    const ok = await as.post('/api/account/password').send({ currentPassword: password, newPassword: 'Nikah-Lights-55' }).expect(200);
    const fresh = cookie(ok, 'customer_token')!;
    await http().get('/api/auth/me').set('Cookie', session).expect(401);
    await http().get('/api/auth/me').set('Cookie', fresh).expect(200);
    as.get = (url) => http().get(url).set('Cookie', fresh);
    as.post = (url) => http().post(url).set('Cookie', fresh);
    as.patch = (url) => http().patch(url).set('Cookie', fresh);
    as.delete = (url) => http().delete(url).set('Cookie', fresh);

    // Addresses: first is default; one default at a time; country validated
    const address = { fullName: 'Fatima K', line1: '12 Rose St', city: 'Parramatta', state: 'NSW', postcode: '2150', countryCode: 'au' };
    const first = await as.post('/api/account/addresses').send(address).expect(201);
    expect(first.body).toMatchObject({ isDefault: true, countryCode: 'AU' });
    const second = await as.post('/api/account/addresses').send({ ...address, line1: '9 Jasmine Ave', countryCode: 'GB', isDefault: true }).expect(201);
    const list = await as.get('/api/account/addresses').expect(200);
    expect(list.body.map((a: { id: string; isDefault: boolean }) => [a.id, a.isDefault])).toEqual([
      [second.body.id, true],
      [first.body.id, false],
    ]);
    const bad = await as.post('/api/account/addresses').send({ ...address, countryCode: 'XX' }).expect(400);
    expect(bad.body.message[0]).toMatch(/valid country/);
    await as.delete(`/api/account/addresses/${second.body.id}`).expect(200);
    const after = await as.get('/api/account/addresses').expect(200);
    expect(after.body).toEqual([expect.objectContaining({ id: first.body.id, isDefault: true })]);

    // Wishlist: product cards with currency; archived products hidden but kept
    const products = await prisma.product.findMany({ where: { status: 'ACTIVE' }, select: { id: true }, take: 2, orderBy: { slug: 'asc' } });
    for (const p of products) await as.post('/api/account/wishlist').send({ productId: p.id }).expect(201);
    await as.post('/api/account/wishlist').send({ productId: products[0].id }).expect(201); // idempotent
    const wishlist = await as.get('/api/account/wishlist?currency=GBP').expect(200);
    expect(wishlist.body.total).toBe(2);
    expect(wishlist.body.items[0]).toMatchObject({ price: { currencyCode: 'GBP' }, slug: expect.any(String), sizes: expect.any(Array) });
    const ids = await as.get('/api/account/wishlist/ids').expect(200);
    expect(ids.body.productIds.sort()).toEqual(products.map((p) => p.id).sort());

    await prisma.product.update({ where: { id: products[1].id }, data: { status: 'ARCHIVED' } });
    try {
      const hidden = await as.get('/api/account/wishlist').expect(200);
      expect(hidden.body.total).toBe(1);
      expect(await prisma.wishlistItem.count({ where: { customer: { email: accountEmail } } })).toBe(2);
    } finally {
      await prisma.product.update({ where: { id: products[1].id }, data: { status: 'ACTIVE' } });
    }
    await as.delete(`/api/account/wishlist/${products[0].id}`).expect(200);
    await http().get('/api/account/wishlist').expect(401);

    // Admin: search, then deactivate → signed out and can't log in
    const search = await http().get(`/api/admin/customers?q=fatima ${run}`).set('Cookie', adminCookie).expect(200);
    expect(search.body.items).toEqual([expect.objectContaining({ email: accountEmail, hasAccount: true, isActive: true })]);
    const id = search.body.items[0].id;
    await http().patch(`/api/admin/customers/${id}`).set('Cookie', adminCookie).send({ isActive: false }).expect(200);
    await http().get('/api/auth/me').set('Cookie', fresh).expect(401);
    const blocked = await http().post('/api/auth/login').send({ email: accountEmail, password: 'Nikah-Lights-55' }).expect(403);
    expect(blocked.body.message).toMatch(/disabled/);
  });
});
