import type { INestApplication } from '@nestjs/common';
import sharp from 'sharp';
import { api, createTestApp, loginAsAdmin } from './helpers/app.js';
import { startRevalidateServer } from './helpers/revalidate-server.js';

describe('Uploads, content, redirects & revalidation (e2e)', () => {
  let app: INestApplication;
  let cookie: string;
  let storefront: Awaited<ReturnType<typeof startRevalidateServer>>;
  const run = Date.now().toString(36);
  const cleanup: (() => Promise<unknown>)[] = [];

  const http = () => api(app);
  const admin = {
    get: (url: string) => http().get(url).set('Cookie', cookie),
    post: (url: string) => http().post(url).set('Cookie', cookie),
    patch: (url: string) => http().patch(url).set('Cookie', cookie),
    put: (url: string) => http().put(url).set('Cookie', cookie),
    delete: (url: string) => http().delete(url).set('Cookie', cookie),
  };

  beforeAll(async () => {
    storefront = await startRevalidateServer();
    app = await createTestApp();
    cookie = await loginAsAdmin(app);
  });

  afterAll(async () => {
    for (const undo of cleanup.reverse()) await undo();
    await app.close();
    await storefront.close();
  });

  it('uploads images: real type check, EXIF rotate + strip, resize, WebP, served at its URL', async () => {
    // Stored 3000×1000 with "rotate 90°" EXIF → displays 1000×3000 → fits to 800×2400
    const photo = await sharp({ create: { width: 3000, height: 1000, channels: 3, background: '#b76e79' } })
      .jpeg()
      .withMetadata({ orientation: 6, exif: { IFD0: { Make: 'PhoneCam' } } })
      .toBuffer();
    const small = await sharp({ create: { width: 300, height: 200, channels: 3, background: '#eee' } })
      .png()
      .toBuffer();

    const res = await admin
      .post('/api/admin/uploads')
      .attach('files', photo, 'mehndi.jpg')
      .attach('files', small, 'swatch.png')
      .expect(201);

    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ width: 800, height: 2400 });
    expect(res.body[1]).toMatchObject({ width: 300, height: 200 });
    expect(res.body[0].url).toMatch(/^http:\/\/localhost:3000\/uploads\/images\/\d{4}\/\d{2}\/[0-9a-f-]+\.webp$/);

    const path = new URL(res.body[0].url).pathname;
    const file = await http().get(path).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on('data', (c: Buffer) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    }).expect(200);
    expect(file.headers['content-type']).toBe('image/webp');
    const meta = await sharp(file.body as Buffer).metadata();
    expect(meta).toMatchObject({ format: 'webp', width: 800, height: 2400 });
    expect(meta.exif).toBeUndefined();

    // A text file renamed to .png is rejected by its real content
    const fake = await admin
      .post('/api/admin/uploads')
      .attach('files', Buffer.from('<script>alert(1)</script>'), { filename: 'evil.png', contentType: 'image/png' })
      .expect(400);
    expect(fake.body.message).toBe('"evil.png" is not a valid image');

    // Over 15 MB → 413 with a friendly message
    const tooBig = await admin
      .post('/api/admin/uploads')
      .attach('files', Buffer.alloc(15 * 1024 * 1024 + 1), 'huge.jpg')
      .expect(413);
    expect(tooBig.body.message).toBe('Each image must be 15 MB or smaller');

    // Admin only
    await http().post('/api/admin/uploads').attach('files', small, 'x.png').expect(401);
    // Unknown upload paths 404 without leaking anything
    await http().get('/uploads/images/nope.webp').expect(404);
  });

  it('builds the home page from sections with a smart-collection carousel', async () => {
    const pages = await admin.get('/api/admin/pages').expect(200);
    const home = pages.body.find((p: { slug: string }) => p.slug === 'home');
    const categories = await admin.get('/api/admin/categories').expect(200);
    const bridal = categories.body.find((c: { slug: string }) => c.slug === 'bridal');

    const collection = await admin
      .post('/api/admin/collections')
      .send({
        title: `E2E Home Bridal ${run}`,
        type: 'SMART',
        defaultSort: 'PRICE_DESC',
        rules: [{ field: 'CATEGORY', value: bridal.id }],
      })
      .expect(201);
    cleanup.push(() => admin.delete(`/api/admin/collections/${collection.body.id}`));

    // Section validation
    const noImage = await admin
      .post(`/api/admin/pages/${home.id}/sections`)
      .send({ type: 'HERO_BANNER', title: 'Hello' })
      .expect(400);
    expect(noImage.body.message).toEqual(['Hero banner sections need an image']);
    await admin
      .post(`/api/admin/pages/${home.id}/sections`)
      .send({ type: 'PRODUCT_CAROUSEL', collectionId: 'does-not-exist' })
      .expect(400);

    const carousel = await admin
      .post(`/api/admin/pages/${home.id}/sections`)
      .send({ type: 'PRODUCT_CAROUSEL', title: 'Bridal Favourites', collectionId: collection.body.id, productLimit: 2 })
      .expect(201);
    const text = await admin
      .post(`/api/admin/pages/${home.id}/sections`)
      .send({ type: 'RICH_TEXT', body: '<p onclick="steal()">Made in our studio</p><script>alert(1)</script>' })
      .expect(201);
    const hidden = await admin
      .post(`/api/admin/pages/${home.id}/sections`)
      .send({ type: 'FAQ', title: 'Hidden FAQ', isActive: false })
      .expect(201);
    for (const s of [carousel, text, hidden]) {
      cleanup.push(() => admin.delete(`/api/admin/pages/${home.id}/sections/${s.body.id}`));
    }
    expect(text.body.body).toBe('<p>Made in our studio</p>');

    // The storefront was told to refresh the home page
    const call = await storefront.waitForTag('page:home');
    expect(call.secret).toBe('e2e-revalidate-secret-0123456789abcdef');

    const page = await http().get('/api/pages/home?currency=USD').expect(200);
    const sections = page.body.sections.filter((s: { id: string }) =>
      [carousel.body.id, text.body.id, hidden.body.id].includes(s.id),
    );
    // Active sections only, in order
    expect(sections.map((s: { type: string }) => s.type)).toEqual(['PRODUCT_CAROUSEL', 'RICH_TEXT']);
    const [rendered] = sections;
    expect(rendered.collection).toEqual({ title: `E2E Home Bridal ${run}`, slug: collection.body.slug });
    // Seeded bridal products by price desc: Ivory Zardozi Lehenga, Crimson Velvet Gharara
    expect(rendered.products.map((p: { name: string }) => p.name)).toEqual([
      'Ivory Zardozi Bridal Lehenga',
      'Crimson Velvet Gharara Set',
    ]);
    expect(rendered.products[0].price).toEqual({ amount: 162500, currencyCode: 'USD' });
    expect(rendered.products[0]).toHaveProperty('sizes');

    // Unpublishing the collection removes the section instead of breaking the page
    await admin.patch(`/api/admin/collections/${collection.body.id}`).send({ isPublished: false }).expect(200);
    const after = await http().get('/api/pages/home').expect(200);
    expect(after.body.sections.some((s: { id: string }) => s.id === carousel.body.id)).toBe(false);

    // The home page is protected
    await admin.delete(`/api/admin/pages/${home.id}`).expect(400);
    await admin.patch(`/api/admin/pages/${home.id}`).send({ slug: 'start' }).expect(400);
    await http().get('/api/pages/does-not-exist').expect(404);
  });

  it('creates redirects on slug changes, without chains or loops', async () => {
    const product = await admin
      .post('/api/admin/products')
      .send({ name: `E2E Walima Gown ${run}`, price: 25000, status: 'ACTIVE' })
      .expect(201);
    cleanup.push(() => admin.delete(`/api/admin/products/${product.body.id}`));
    const original = product.body.slug;

    await admin.patch(`/api/admin/products/${product.body.id}`).send({ slug: `${original}-v2` }).expect(200);
    const first = await http().get(`/api/redirects/resolve?path=/products/${original}`).expect(200);
    expect(first.body).toEqual({ toPath: `/products/${original}-v2`, statusCode: 301 });
    await storefront.waitForTag(`product:${original}-v2`);

    // Second rename: the first redirect points straight at the newest URL
    await admin.patch(`/api/admin/products/${product.body.id}`).send({ slug: `${original}-v3` }).expect(200);
    const flattened = await http().get(`/api/redirects/resolve?path=/Products/${original.toUpperCase()}/?utm=ig`).expect(200);
    expect(flattened.body.toPath).toBe(`/products/${original}-v3`);

    // Renaming back to the original: original is live again, no loop
    await admin.patch(`/api/admin/products/${product.body.id}`).send({ slug: original }).expect(200);
    await http().get(`/api/redirects/resolve?path=/products/${original}`).expect(404);
    const back = await http().get(`/api/redirects/resolve?path=/products/${original}-v2`).expect(200);
    expect(back.body.toPath).toBe(`/products/${original}`);

    // Manual redirects are checked for loops
    const loop = await admin
      .post('/api/admin/redirects')
      .send({ fromPath: `/products/${original}`, toPath: `/products/${original}-v2` })
      .expect(400);
    expect(loop.body.message).toMatch(/loop/);

    const redirects = await admin.get(`/api/admin/redirects?q=${original}`).expect(200);
    for (const r of redirects.body.items) {
      cleanup.push(() => admin.delete(`/api/admin/redirects/${r.id}`));
    }
  });

  it('serves menus, banners, FAQs, settings and category pages', async () => {
    // Menus: unpublished targets are left out
    const collections = await admin.get('/api/admin/collections').expect(200);
    const live = await admin
      .post('/api/admin/collections')
      .send({ title: `E2E Menu Live ${run}` })
      .expect(201);
    const draft = await admin
      .post('/api/admin/collections')
      .send({ title: `E2E Menu Draft ${run}`, isPublished: false })
      .expect(201);
    cleanup.push(() => admin.delete(`/api/admin/collections/${live.body.id}`));
    cleanup.push(() => admin.delete(`/api/admin/collections/${draft.body.id}`));
    expect(collections.body.length).toBeGreaterThanOrEqual(0);

    const heading = await admin
      .post('/api/admin/menus/main/items')
      .send({ label: `E2E Shop ${run}`, type: 'HEADING' })
      .expect(201);
    cleanup.push(() => admin.delete(`/api/admin/menus/main/items/${heading.body.id}`));
    await admin
      .post('/api/admin/menus/main/items')
      .send({ label: 'Live', type: 'COLLECTION', collectionId: live.body.id, parentId: heading.body.id })
      .expect(201);
    await admin
      .post('/api/admin/menus/main/items')
      .send({ label: 'Draft', type: 'COLLECTION', collectionId: draft.body.id, parentId: heading.body.id })
      .expect(201);
    await admin
      .post('/api/admin/menus/main/items')
      .send({ label: 'Bad', type: 'URL', url: 'javascript:alert(1)' })
      .expect(400);
    await admin
      .post('/api/admin/menus/main/items')
      .send({ label: 'Mismatch', type: 'CATEGORY', collectionId: live.body.id })
      .expect(400);
    // A heading can't move under its own child
    const child = (await admin.get('/api/admin/menus/main').expect(200)).body.items
      .find((i: { id: string }) => i.id === heading.body.id).children[0];
    await admin
      .patch(`/api/admin/menus/main/items/${heading.body.id}`)
      .send({ parentId: child.id })
      .expect(400);

    const menu = await http().get('/api/menus/main').expect(200);
    const shop = menu.body.items.find((i: { id: string }) => i.id === heading.body.id);
    expect(shop).toMatchObject({ href: null, type: 'HEADING' });
    expect(shop.children).toEqual([
      expect.objectContaining({ label: 'Live', href: `/collections/${live.body.slug}`, children: [] }),
    ]);
    await storefront.waitForTag('menu:main');

    // Banners: only active ones inside their dates
    const hour = 60 * 60 * 1000;
    const banner = (title: string, extra: object) =>
      admin
        .post('/api/admin/banners')
        .send({ title, imageUrl: 'https://cdn.example.com/b.webp', placement: `e2e_${run}`, ...extra })
        .expect(201);
    const created = [
      await banner('live', { startsAt: new Date(Date.now() - hour).toISOString() }),
      await banner('future', { startsAt: new Date(Date.now() + hour).toISOString() }),
      await banner('expired', { endsAt: new Date(Date.now() - hour).toISOString() }),
      await banner('off', { isActive: false }),
    ];
    for (const b of created) cleanup.push(() => admin.delete(`/api/admin/banners/${b.body.id}`));
    await admin
      .post('/api/admin/banners')
      .send({ imageUrl: 'https://x/b.webp', startsAt: '2026-02-01', endsAt: '2026-01-01' })
      .expect(400);
    const banners = await http().get(`/api/banners?placement=e2e_${run}`).expect(200);
    expect(banners.body.map((b: { title: string }) => b.title)).toEqual(['live']);

    // FAQ answers are sanitized
    const faq = await admin
      .post('/api/admin/faqs')
      .send({ question: `E2E Do you ship worldwide? ${run}`, answer: '<p>Yes<img src=x onerror=alert(1)></p>' })
      .expect(201);
    cleanup.push(() => admin.delete(`/api/admin/faqs/${faq.body.id}`));
    expect(faq.body.answer).toBe('<p>Yes</p>');
    const faqs = await http().get('/api/faqs').expect(200);
    expect(faqs.body.some((f: { id: string }) => f.id === faq.body.id)).toBe(true);

    // Settings: public view is an allow-list
    await admin.patch('/api/admin/settings').send({ whatsappNumber: '+61 400 000 000' }).expect(200);
    const settings = await http().get('/api/settings').expect(200);
    expect(settings.body.whatsappNumber).toBe('+61 400 000 000');
    expect(Object.keys(settings.body).sort()).toEqual(
      [
        'announcementBar',
        'contactEmail',
        'contactPhone',
        'facebookUrl',
        'googleAnalyticsId',
        'instagramUrl',
        'metaPixelId',
        'storeName',
        'tiktokUrl',
        'whatsappNumber',
      ].sort(),
    );
    await storefront.waitForTag('settings');

    // Category page: same listing and facets as collections, including sub-categories
    const category = await http().get('/api/categories/bridal?currency=AUD').expect(200);
    expect(category.body.category).toMatchObject({ slug: 'bridal', breadcrumb: [{ slug: 'bridal', name: 'Bridal' }] });
    expect(category.body.category.children.map((c: { name: string }) => c.name)).toEqual([
      'Lehenga',
      'Sharara',
      'Gharara',
    ]);
    expect(category.body.products.total).toBeGreaterThanOrEqual(3);
    expect(category.body.sortOptions).not.toContain('MANUAL');
    expect(category.body.facets.attributes.length).toBeGreaterThan(0);
    const mehndi = await http().get('/api/categories/bridal?attr=occasion.mehndi').expect(200);
    expect(mehndi.body.products.items.map((p: { name: string }) => p.name)).toContain('Mint Gota Mehndi Sharara');
    await http().get('/api/categories/no-such-category').expect(404);
  });
});
