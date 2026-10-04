import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, loginAsAdmin } from './helpers/app.js';

interface Facets {
  sizes: { value: string; count: number; selected: boolean }[];
  colours: { value: string; count: number; selected: boolean }[];
  attributes: { slug: string; values: { slug: string; count: number }[] }[];
  categories: { slug: string; count: number; parentSlug: string | null }[];
  onSale: { count: number };
  readyToShip: { count: number };
  price: { min: { amount: number }; max: { amount: number } } | null;
}

describe('Catalog & collections (e2e)', () => {
  let app: INestApplication;
  let cookie: string;
  const run = Date.now().toString(36);
  const created = { categories: [] as string[], products: [] as string[], collections: [] as string[] };

  const admin = () => ({
    get: (url: string) => request(app.getHttpServer()).get(url).set('Cookie', cookie),
    post: (url: string) => request(app.getHttpServer()).post(url).set('Cookie', cookie),
    patch: (url: string) => request(app.getHttpServer()).patch(url).set('Cookie', cookie),
    delete: (url: string) => request(app.getHttpServer()).delete(url).set('Cookie', cookie),
  });
  const shop = (url: string) => request(app.getHttpServer()).get(url);

  beforeAll(async () => {
    app = await createTestApp();
    cookie = await loginAsAdmin(app);
  });

  afterAll(async () => {
    for (const id of created.collections) await admin().delete(`/api/admin/collections/${id}`);
    for (const id of created.products) await admin().delete(`/api/admin/products/${id}`);
    for (const id of [...created.categories].reverse()) {
      await admin().delete(`/api/admin/categories/${id}`);
    }
    await app.close();
  });

  it('admin creates a category tree, products with variants, and a smart collection the shop can filter', async () => {
    // Category tree
    const parent = await admin()
      .post('/api/admin/categories')
      .send({ name: `E2E Bridal ${run}` })
      .expect(201);
    const child = await admin()
      .post('/api/admin/categories')
      .send({ name: `E2E Lehenga ${run}`, parentId: parent.body.id })
      .expect(201);
    created.categories.push(parent.body.id, child.body.id);
    expect(parent.body.slug).toBe(`e2e-bridal-${run}`);

    // A category can't move under its own child
    const cycle = await admin()
      .patch(`/api/admin/categories/${parent.body.id}`)
      .send({ parentId: child.body.id })
      .expect(400);
    expect(cycle.body.message).toMatch(/inside itself/);

    // Seeded filter option: Fabric → Chiffon
    const attributes = await admin().get('/api/admin/attributes').expect(200);
    const fabric = attributes.body.find((a: { slug: string }) => a.slug === 'fabric');
    const chiffon = fabric.values.find((v: { slug: string }) => v.slug === 'chiffon');

    // Active product in the child category, on sale, with variants
    const product = await admin()
      .post('/api/admin/products')
      .send({
        name: `E2E Mint Sharara ${run}`,
        status: 'ACTIVE',
        categoryId: child.body.id,
        price: 10000,
        compareAtPrice: 12000,
        tags: [' E2E-Tag ', 'e2e-tag'],
        attributeValueIds: [chiffon.id],
        images: [{ url: 'https://example.com/a.jpg', altText: 'Front' }],
      })
      .expect(201);
    created.products.push(product.body.id);
    expect(product.body.tags).toEqual(['e2e-tag']);
    expect(product.body.price).toEqual({ amount: 10000, currencyCode: 'AUD' });

    const generated = await admin()
      .post(`/api/admin/products/${product.body.id}/variants/generate`)
      .send({ sizes: ['S', 'M'], colours: ['Mint'], stock: 3 })
      .expect(201);
    expect(generated.body.created).toBe(2);

    // Generating again only adds the missing combination
    const again = await admin()
      .post(`/api/admin/products/${product.body.id}/variants/generate`)
      .send({ sizes: ['s', 'M', 'L'], colours: ['mint'], stock: 0 })
      .expect(201);
    expect(again.body).toMatchObject({ created: 1, alreadyExisted: 2 });

    // Draft product in the same category must stay hidden
    const draft = await admin()
      .post('/api/admin/products')
      .send({ name: `E2E Draft Gharara ${run}`, categoryId: child.body.id, price: 5000 })
      .expect(201);
    created.products.push(draft.body.id);
    expect(draft.body.status).toBe('DRAFT');
    await admin()
      .post(`/api/admin/products/${draft.body.id}/variants/generate`)
      .send({ sizes: ['S'], colours: ['Red'], stock: 5 })
      .expect(201);

    // Smart collection: everything in the PARENT category (sub-categories included)
    const rules = [{ field: 'CATEGORY', operator: 'EQUALS', value: parent.body.id }];
    const preview = await admin().post('/api/admin/collections/preview').send({ rules }).expect(201);
    expect(preview.body.total).toBe(1);

    const collection = await admin()
      .post('/api/admin/collections')
      .send({ title: `E2E Bridal Edit ${run}`, type: 'SMART', rules, noticeText: 'Made to order' })
      .expect(201);
    created.collections.push(collection.body.id);

    // Public collection page
    const page = await shop(`/api/collections/${collection.body.slug}`).expect(200);
    expect(page.body.collection).toMatchObject({ title: `E2E Bridal Edit ${run}`, noticeText: 'Made to order' });
    expect(page.body.products.total).toBe(1);
    const [card] = page.body.products.items;
    expect(card).toMatchObject({
      slug: product.body.slug,
      price: { amount: 10000, currencyCode: 'AUD' },
      compareAtPrice: { amount: 12000, currencyCode: 'AUD' },
      sizes: ['S', 'M'], // L has no stock
      images: [{ url: 'https://example.com/a.jpg', altText: 'Front' }],
    });

    const facets: Facets = page.body.facets;
    expect(facets.sizes).toEqual([
      { value: 'S', count: 1, selected: false },
      { value: 'M', count: 1, selected: false },
    ]);
    expect(facets.colours).toEqual([{ value: 'Mint', count: 1, selected: false }]);
    expect(facets.onSale.count).toBe(1);
    expect(facets.readyToShip.count).toBe(0);
    const fabricFacet = facets.attributes.find((a) => a.slug === 'fabric');
    expect(fabricFacet?.values).toEqual([
      { value: 'Chiffon', slug: 'chiffon', count: 1, selected: false },
    ]);
    expect(facets.categories).toEqual([
      expect.objectContaining({ slug: parent.body.slug, count: 1, parentSlug: null }),
      expect.objectContaining({ slug: child.body.slug, count: 1, parentSlug: parent.body.slug }),
    ]);

    // Filtering by a colour with no match empties the grid, but the colour
    // facet ignores its own filter, so Mint still shows its real count.
    const blue = await shop(`/api/collections/${collection.body.slug}?colours=Blue`).expect(200);
    expect(blue.body.products.total).toBe(0);
    expect(blue.body.facets.colours).toEqual([
      { value: 'Blue', count: 0, selected: true },
      { value: 'Mint', count: 1, selected: false },
    ]);
    expect(blue.body.facets.sizes).toEqual([]);

    // Case-insensitive size + attribute filters
    const filtered = await shop(
      `/api/collections/${collection.body.slug}?sizes=s&attr=fabric.chiffon&onSale=true`,
    ).expect(200);
    expect(filtered.body.products.total).toBe(1);
    const silk = await shop(`/api/collections/${collection.body.slug}?attr=fabric.silk`).expect(200);
    expect(silk.body.products.total).toBe(0);

    // Currency conversion: 10000 AUD cents × 0.65, rounded up to whole USD
    const usd = await shop(`/api/collections/${collection.body.slug}?currency=usd`).expect(200);
    expect(usd.body.currency).toBe('USD');
    expect(usd.body.products.items[0].price).toEqual({ amount: 6500, currencyCode: 'USD' });

    // Price filter in the shopper's currency
    const under60 = await shop(`/api/collections/${collection.body.slug}?currency=USD&maxPrice=6000`);
    expect(under60.body.products.total).toBe(0);
    const under65 = await shop(`/api/collections/${collection.body.slug}?currency=USD&maxPrice=6500`);
    expect(under65.body.products.total).toBe(1);

    // Unknown currency falls back to AUD
    const xyz = await shop(`/api/collections/${collection.body.slug}?currency=XYZ`).expect(200);
    expect(xyz.body.products.items[0].price.currencyCode).toBe('AUD');

    // Product page: active only, breadcrumb, effective variant prices
    const detail = await shop(`/api/products/${product.body.slug}?currency=USD`).expect(200);
    expect(detail.body.breadcrumb.map((b: { slug: string }) => b.slug)).toEqual([
      parent.body.slug,
      child.body.slug,
    ]);
    expect(detail.body.variants).toHaveLength(3);
    expect(detail.body.variants[0].price).toEqual({ amount: 6500, currencyCode: 'USD' });
    expect(detail.body.attributes).toEqual([
      { name: 'Fabric', slug: 'fabric', values: [{ value: 'Chiffon', slug: 'chiffon' }] },
    ]);
    await shop(`/api/products/${draft.body.slug}`).expect(404);

    // Search by tag (case-insensitive) and by name; draft excluded
    const byTag = await shop('/api/search?q=E2E-TAG').expect(200);
    expect(byTag.body.items.map((i: { slug: string }) => i.slug)).toContain(product.body.slug);
    const byName = await shop(`/api/search?q=gharara ${run}`).expect(200);
    expect(byName.body.total).toBe(0);

    // Unpublished collection → 404
    await admin()
      .patch(`/api/admin/collections/${collection.body.id}`)
      .send({ isPublished: false })
      .expect(200);
    await shop(`/api/collections/${collection.body.slug}`).expect(404);
  });

  it('keeps manual collections in the owner\'s order and validates rules', async () => {
    const products = await admin().get('/api/admin/products?status=ACTIVE&pageSize=3').expect(200);
    const ids: string[] = products.body.items.map((p: { id: string }) => p.id);
    expect(ids.length).toBeGreaterThanOrEqual(2);

    const manual = await admin()
      .post('/api/admin/collections')
      .send({ title: `E2E Hand Picked ${run}` })
      .expect(201);
    created.collections.push(manual.body.id);
    expect(manual.body).toMatchObject({ type: 'MANUAL', defaultSort: 'MANUAL' });

    await admin().post(`/api/admin/collections/${manual.body.id}/products`).send({ productIds: ids }).expect(201);
    const reversed = [...ids].reverse();
    await request(app.getHttpServer())
      .put(`/api/admin/collections/${manual.body.id}/products/reorder`)
      .set('Cookie', cookie)
      .send({ productIds: reversed })
      .expect(200);

    const page = await shop(`/api/collections/${manual.body.slug}`).expect(200);
    expect(page.body.sort).toBe('MANUAL');
    expect(page.body.products.items.map((i: { id: string }) => i.id)).toEqual(reversed);

    // Rules on a manual collection, bad operators and unknown ids are rejected
    await admin()
      .patch(`/api/admin/collections/${manual.body.id}`)
      .send({ rules: [{ field: 'TAG', value: 'x' }] })
      .expect(400);
    const badRules = await admin()
      .post('/api/admin/collections/preview')
      .send({ rules: [{ field: 'PRICE', operator: 'LESS_THAN', value: '$199' }] })
      .expect(400);
    expect(badRules.body.message[0]).toMatch(/Rule 1: .*whole number of cents/);
    await admin()
      .post('/api/admin/collections/preview')
      .send({ rules: [{ field: 'CATEGORY', value: 'does-not-exist' }] })
      .expect(400);
  });
});
