// Seed. On a live shop run it with SEED_SAMPLE_PRODUCTS=false: you then get the owner account,
// settings, currencies, shipping, menus, the homepage, and the starting categories and filters,
// but none of the sample products. Safe to run repeatedly: every write is an upsert or
// "create if missing", and existing rows are never overwritten (so values the
// owner edits in admin — rates, settings, passwords — survive a re-seed).
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client.js';
import { SHOP_SECTIONS } from './seed-data/shop-menu.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set (check your .env)');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

async function seedStoreSettings() {
  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, storeName: 'Malikah Bridal Studio', gstRatePercent: 10 },
  });
}

async function seedCurrencies() {
  // Placeholder rates — the owner sets real ones in admin.
  const currencies = [
    { code: 'AUD', symbol: 'A$', rateFromAud: 1, isDefault: true },
    { code: 'USD', symbol: 'US$', rateFromAud: 0.65, isDefault: false },
    { code: 'GBP', symbol: '£', rateFromAud: 0.52, isDefault: false },
    { code: 'CAD', symbol: 'C$', rateFromAud: 0.9, isDefault: false },
    { code: 'NZD', symbol: 'NZ$', rateFromAud: 1.09, isDefault: false },
  ];
  for (const c of currencies) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: {},
      // AUD is the base currency and is never rounded; others round up to whole units.
      create: { ...c, roundTo: c.code === 'AUD' ? 1 : 100 },
    });
  }
}

async function seedShipping() {
  // Placeholder prices in AUD cents.
  const zones = [
    { name: 'Australia', countryCodes: ['AU'], chargesGst: true, isFallback: false, price: 1500, freeOverAmount: 30000, estimatedDays: '3–7 business days' },
    { name: 'New Zealand', countryCodes: ['NZ'], chargesGst: false, isFallback: false, price: 3000, freeOverAmount: null, estimatedDays: '7–12 business days' },
    { name: 'United Kingdom', countryCodes: ['GB'], chargesGst: false, isFallback: false, price: 4500, freeOverAmount: null, estimatedDays: '10–15 business days' },
    { name: 'United States', countryCodes: ['US'], chargesGst: false, isFallback: false, price: 4500, freeOverAmount: null, estimatedDays: '10–15 business days' },
    { name: 'Rest of World', countryCodes: [], chargesGst: false, isFallback: true, price: 6000, freeOverAmount: null, estimatedDays: '12–20 business days' },
  ];

  for (const { price, freeOverAmount, estimatedDays, ...zone } of zones) {
    // ShippingZone has no unique column, so match by name.
    const existing = await prisma.shippingZone.findFirst({
      where: { name: zone.name },
    });
    const zoneRow = existing ?? (await prisma.shippingZone.create({ data: zone }));

    const rate = await prisma.shippingRate.findFirst({
      where: { zoneId: zoneRow.id, name: 'Standard' },
    });
    if (!rate) {
      await prisma.shippingRate.create({
        data: { zoneId: zoneRow.id, name: 'Standard', price, freeOverAmount, estimatedDays },
      });
    }
  }
}

async function seedContent() {
  await prisma.menu.upsert({
    where: { handle: 'main' },
    update: {},
    create: { handle: 'main', name: 'Main menu' },
  });
  await prisma.menu.upsert({
    where: { handle: 'footer' },
    update: {},
    create: { handle: 'footer', name: 'Footer menu' },
  });
  await prisma.page.upsert({
    where: { slug: 'home' },
    update: {},
    create: { slug: 'home', title: 'Home', showInFooter: false },
  });
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || 'Store Owner';
  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env to seed the owner account');
  }
  if (password.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters');
  }

  // update: {} — never reset the password of an existing admin.
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      role: 'OWNER',
      passwordHash: await argon2.hash(password),
    },
  });
}

const ATTRIBUTES: Record<string, string[]> = {
  Fabric: ['Chiffon', 'Organza', 'Velvet', 'Silk', 'Net', 'Lawn'],
  Occasion: ['Nikah', 'Mehndi', 'Barat', 'Walima', 'Eid', 'Formal'],
  Work: ['Zardozi', 'Gota', 'Mirror Work', 'Sequins', 'Thread Embroidery'],
};

// Returns "Attribute:Value" -> AttributeValue id
async function seedAttributes(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  let attrOrder = 0;
  for (const [name, values] of Object.entries(ATTRIBUTES)) {
    const attribute = await prisma.attribute.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name), sortOrder: attrOrder++ },
    });
    for (const [i, value] of values.entries()) {
      const row = await prisma.attributeValue.upsert({
        where: { attributeId_slug: { attributeId: attribute.id, slug: slugify(value) } },
        update: {},
        create: { attributeId: attribute.id, value, slug: slugify(value), sortOrder: i },
      });
      ids.set(`${name}:${value}`, row.id);
    }
  }
  return ids;
}

// Category slugs: "Bridal Wear" → bridal-wear, its "Lehengas" → bridal-wear-lehengas
// (children are prefixed so e.g. "Sarees" can't clash between two sections).
const childSlug = (parent: string, child: string) => `${slugify(parent)}-${slugify(child)}`;

// Categories come from prisma/seed-data/shop-menu.ts. Returns category slug -> id.
async function seedCategories(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  let parentOrder = 0;
  for (const section of SHOP_SECTIONS) {
    if (section.kind !== 'category') continue;
    const slug = slugify(section.name);
    const parent = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name: section.name, slug, sortOrder: parentOrder },
    });
    parentOrder++;
    ids.set(parent.slug, parent.id);
    for (const [i, childName] of section.items.entries()) {
      const child = await prisma.category.upsert({
        where: { slug: childSlug(section.name, childName) },
        update: {},
        create: { name: childName, slug: childSlug(section.name, childName), parentId: parent.id, sortOrder: i },
      });
      ids.set(child.slug, child.id);
    }
  }
  return ids;
}

// Optional tidy-up (SEED_REMOVE_UNLISTED_CATEGORIES=true): deletes categories that are no longer
// in shop-menu.ts AND have no products, so old starter categories don't show in the shop.
async function removeUnlistedCategories(keep: Map<string, string>) {
  const keepIds = new Set(keep.values());
  const unlisted = await prisma.category.findMany({
    where: { id: { notIn: [...keepIds] } },
    select: { id: true, name: true, parentId: true, _count: { select: { products: true, children: true } } },
  });
  const removable = new Set(unlisted.filter((c) => c._count.products === 0).map((c) => c.id));
  // A parent can only go if all its children go too
  const deletable = unlisted.filter(
    (c) => removable.has(c.id) && unlisted.filter((x) => x.parentId === c.id).every((x) => removable.has(x.id)) &&
      c._count.children === unlisted.filter((x) => x.parentId === c.id).length,
  );
  const ids = deletable.map((c) => c.id);
  if (!ids.length) return;
  await prisma.collectionRule.deleteMany({ where: { field: 'CATEGORY', value: { in: ids } } });
  // Children first
  await prisma.category.deleteMany({ where: { id: { in: ids }, parentId: { not: null } } });
  await prisma.category.deleteMany({ where: { id: { in: ids } } });
  const kept = unlisted.filter((c) => !ids.includes(c.id)).map((c) => c.name);
  console.log(`Removed old categories: ${deletable.map((c) => c.name).join(', ')}`);
  if (kept.length) console.log(`Kept (they still have products): ${kept.join(', ')}`);
}

type CollectionSeed = {
  title: string;
  matchAllRules?: boolean;
  rules: Prisma.CollectionRuleCreateWithoutCollectionInput[];
};

async function upsertCollection(c: CollectionSeed): Promise<string> {
  const slug = slugify(c.title);
  const row = await prisma.collection.upsert({
    where: { slug },
    update: {},
    create: {
      title: c.title,
      slug,
      type: 'SMART',
      matchAllRules: c.matchAllRules ?? true,
      defaultSort: 'NEWEST',
      rules: { create: c.rules },
    },
    select: { id: true },
  });
  return row.id;
}

type MenuSeedItem = {
  label: string;
  type: 'CATEGORY' | 'COLLECTION';
  targetId: string;
  highlight?: string;
  children?: MenuSeedItem[];
};

// Collections for the occasion / New Arrivals / Sale sections, and the header menu.
async function seedShopSections(categoryIds: Map<string, string>, attributeIds: Map<string, string>) {
  const menu: MenuSeedItem[] = [];

  for (const section of SHOP_SECTIONS) {
    if (section.kind === 'category') {
      menu.push({
        label: section.name,
        type: 'CATEGORY',
        targetId: categoryIds.get(slugify(section.name))!,
        highlight: section.highlight,
        children: section.items.map((child) => ({
          label: child,
          type: 'CATEGORY',
          targetId: categoryIds.get(childSlug(section.name, child))!,
        })),
      });
    } else if (section.kind === 'occasion') {
      const valueId = (occasion: string) => {
        const id = attributeIds.get(`Occasion:${occasion}`);
        if (!id) throw new Error(`"${occasion}" is not an Occasion in prisma/seed.ts ATTRIBUTES — add it there first`);
        return id;
      };
      const children: MenuSeedItem[] = [];
      for (const occasion of section.items) {
        const title = section.itemSuffix ? `${occasion} ${section.itemSuffix}` : occasion;
        children.push({
          label: title,
          type: 'COLLECTION',
          targetId: await upsertCollection({ title, rules: [{ field: 'ATTRIBUTE', operator: 'EQUALS', value: valueId(occasion) }] }),
        });
      }
      // The section itself: products for ANY of its occasions
      const parentId = await upsertCollection({
        title: section.name,
        matchAllRules: false,
        rules: section.items.map((o) => ({ field: 'ATTRIBUTE' as const, operator: 'EQUALS' as const, value: valueId(o) })),
      });
      menu.push({ label: section.name, type: 'COLLECTION', targetId: parentId, highlight: section.highlight, children });
    } else {
      const field = section.kind === 'sale' ? 'ON_SALE' : 'NEW_ARRIVAL';
      const id = await upsertCollection({ title: section.name, rules: [{ field, operator: 'EQUALS', value: '' }] });
      menu.push({ label: section.name, type: 'COLLECTION', targetId: id, highlight: section.highlight });
    }
  }

  // Header menu: built once (or rebuilt with SEED_RESET_MAIN_MENU=true) so edits made in
  // admin are never overwritten by a normal re-seed.
  const main = await prisma.menu.findUniqueOrThrow({ where: { handle: 'main' }, select: { id: true, _count: { select: { items: true } } } });
  const reset = process.env.SEED_RESET_MAIN_MENU === 'true';
  if (main._count.items > 0 && !reset) {
    console.log('Header menu already has items — left as is (SEED_RESET_MAIN_MENU=true rebuilds it).');
    return;
  }
  if (reset) await prisma.menuItem.deleteMany({ where: { menuId: main.id } });

  const create = async (item: MenuSeedItem, sortOrder: number, parentId: string | null) => {
    const row = await prisma.menuItem.create({
      data: {
        menuId: main.id,
        parentId,
        label: item.label,
        type: item.type,
        categoryId: item.type === 'CATEGORY' ? item.targetId : null,
        collectionId: item.type === 'COLLECTION' ? item.targetId : null,
        highlight: item.highlight ?? null,
        sortOrder,
      },
      select: { id: true },
    });
    for (const [i, child] of (item.children ?? []).entries()) await create(child, i, row.id);
  };
  for (const [i, item] of menu.entries()) await create(item, i, null);
  console.log(`Header menu built with ${menu.length} sections.`);
}

interface SampleProduct {
  name: string;
  code: string;
  categorySlug: string;
  description: string;
  details: string;
  price: number; // AUD cents, GST-inclusive
  compareAtPrice?: number;
  sizes: string[];
  colours: string[];
  attributes: string[]; // "Attribute:Value"
  tags: string[];
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isReadyToShip?: boolean;
  deliveryDays?: number;
  badge?: string;
}

// Original placeholder products for development only.
const PRODUCTS: SampleProduct[] = [
  {
    name: 'Ivory Zardozi Bridal Lehenga',
    code: 'IZL',
    categorySlug: 'bridal-wear-lehengas',
    description: 'A hand-finished ivory lehenga with fine zardozi detailing, made for the Barat day.',
    details: 'Includes lehenga, short shirt and net dupatta. Made to order in our studio.',
    price: 249900,
    sizes: ['S', 'M', 'L', 'XL'],
    colours: ['Ivory', 'Blush'],
    attributes: ['Fabric:Organza', 'Occasion:Barat', 'Occasion:Nikah', 'Work:Zardozi'],
    tags: ['bridal', 'lehenga', 'heavy'],
    isFeatured: true,
    deliveryDays: 42,
  },
  {
    name: 'Crimson Velvet Gharara Set',
    code: 'CVG',
    categorySlug: 'bridal-wear-gharara',
    description: 'A deep crimson gharara with a velvet shirt and gota-edged dupatta.',
    details: 'Includes shirt, gharara and dupatta. Made to order.',
    price: 189900,
    compareAtPrice: 219900,
    sizes: ['S', 'M', 'L', 'XL'],
    colours: ['Crimson'],
    attributes: ['Fabric:Velvet', 'Occasion:Barat', 'Work:Zardozi', 'Work:Gota'],
    tags: ['bridal', 'gharara', 'sale'],
    deliveryDays: 35,
    badge: 'On Sale',
  },
  {
    name: 'Mint Gota Mehndi Sharara',
    code: 'MGS',
    categorySlug: 'bridal-wear-sharara',
    description: 'A light, playful sharara in mint with gota and mirror accents for the Mehndi.',
    details: 'Includes short kurti, sharara and chiffon dupatta. Ready to ship.',
    price: 89900,
    sizes: ['S', 'M', 'L'],
    colours: ['Mint', 'Mustard'],
    attributes: ['Fabric:Chiffon', 'Occasion:Mehndi', 'Work:Gota', 'Work:Mirror Work'],
    tags: ['mehndi', 'sharara', 'colourful'],
    isNewArrival: true,
    isReadyToShip: true,
    badge: 'New This Week',
  },
  {
    name: 'Emerald Chiffon Formal Maxi',
    code: 'ECM',
    categorySlug: 'womens-wear-maxi-dresses',
    description: 'A flowing emerald maxi with a scattered sequin bodice, ideal for a Walima or formal evening.',
    details: 'Includes maxi and matching dupatta. Ready to ship.',
    price: 49900,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colours: ['Emerald', 'Navy'],
    attributes: ['Fabric:Chiffon', 'Occasion:Walima', 'Occasion:Formal', 'Work:Sequins'],
    tags: ['formal', 'maxi', 'evening'],
    isFeatured: true,
    isReadyToShip: true,
  },
  {
    name: 'Champagne Raw Silk Sherwani',
    code: 'CRS',
    categorySlug: 'menswear-sherwanis',
    description: 'A classic champagne sherwani in raw silk with tonal thread embroidery.',
    details: 'Includes sherwani, kurta and churidar. Made to order.',
    price: 69900,
    sizes: ['38', '40', '42', '44'],
    colours: ['Champagne'],
    attributes: ['Fabric:Silk', 'Occasion:Nikah', 'Occasion:Barat', 'Work:Thread Embroidery'],
    tags: ['menswear', 'sherwani', 'groom'],
    deliveryDays: 28,
  },
];

async function seedProducts(categoryIds: Map<string, string>, attributeIds: Map<string, string>) {
  for (const p of PRODUCTS) {
    const categoryId = categoryIds.get(p.categorySlug);
    if (!categoryId) throw new Error(`Unknown category ${p.categorySlug}`);

    const slug = slugify(p.name);
    const product = await prisma.product.upsert({
      where: { slug },
      // Sample products only: keep them in the current categories from shop-menu.ts
      update: { categoryId },
      create: {
        name: p.name,
        slug,
        description: p.description,
        details: p.details,
        status: 'ACTIVE',
        categoryId,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        tags: p.tags,
        isFeatured: p.isFeatured ?? false,
        isNewArrival: p.isNewArrival ?? false,
        isReadyToShip: p.isReadyToShip ?? false,
        deliveryDays: p.isReadyToShip ? null : p.deliveryDays,
        badge: p.badge,
      },
    });

    let sortOrder = 0;
    for (const colour of p.colours) {
      for (const size of p.sizes) {
        const sku = `MBS-${p.code}-${colour.slice(0, 3).toUpperCase()}-${size}`;
        await prisma.productVariant.upsert({
          where: { sku },
          update: {},
          create: {
            productId: product.id,
            sku,
            size,
            colour,
            stock: 2 + (sortOrder % 4),
            sortOrder: sortOrder++,
          },
        });
      }
    }

    await prisma.productAttributeValue.createMany({
      data: p.attributes.map((key) => {
        const attributeValueId = attributeIds.get(key);
        if (!attributeValueId) throw new Error(`Unknown attribute value ${key}`);
        return { productId: product.id, attributeValueId };
      }),
      skipDuplicates: true,
    });
  }
}

async function main() {
  await seedStoreSettings();
  await seedCurrencies();
  await seedShipping();
  await seedContent();
  await seedAdmin();
  const attributeIds = await seedAttributes();
  const categoryIds = await seedCategories();
  // The sample dresses are for development and demos only
  if (process.env.SEED_SAMPLE_PRODUCTS !== 'false') await seedProducts(categoryIds, attributeIds);
  if (process.env.SEED_REMOVE_UNLISTED_CATEGORIES === 'true') await removeUnlistedCategories(categoryIds);
  await seedShopSections(categoryIds, attributeIds);

  const counts = {
    currencies: await prisma.currency.count(),
    shippingZones: await prisma.shippingZone.count(),
    shippingRates: await prisma.shippingRate.count(),
    attributes: await prisma.attribute.count(),
    attributeValues: await prisma.attributeValue.count(),
    categories: await prisma.category.count(),
    collections: await prisma.collection.count(),
    menuItems: await prisma.menuItem.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    admins: await prisma.adminUser.count(),
  };
  console.log('Seed complete:', counts);
  await refreshStorefront();
}

// The seed writes to the database directly, so tell the website to drop its cached pages
// (same call the admin makes). Skipped quietly if the website isn't running.
async function refreshStorefront() {
  const url = process.env.FRONTEND_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) return;
  const tags = ['menu:main', 'menu:footer', 'categories', 'collections', 'products', 'currencies', 'settings', 'pages', 'page:home'];
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(5000),
    });
    console.log(res.ok ? 'Website cache refreshed.' : `Website cache refresh failed (HTTP ${res.status}).`);
  } catch {
    console.log('Website not running — its cache will show the new data after it restarts.');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
