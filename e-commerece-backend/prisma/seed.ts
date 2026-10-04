// Development seed. Safe to run repeatedly: every write is an upsert or
// "create if missing", and existing rows are never overwritten (so values the
// owner edits in admin — rates, settings, passwords — survive a re-seed).
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set (check your .env)');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const slugify = (s: string) =>
  s
    .toLowerCase()
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

const CATEGORIES: Record<string, string[]> = {
  Bridal: ['Lehenga', 'Sharara', 'Gharara'],
  Formals: ['Maxi', 'Kurta Set'],
  'Party Wear': ['Anarkali Frock', 'Saree'],
  Menswear: ['Sherwani', 'Kurta Pajama'],
};

// Returns category slug -> id
async function seedCategories(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  let parentOrder = 0;
  for (const [parentName, children] of Object.entries(CATEGORIES)) {
    const parent = await prisma.category.upsert({
      where: { slug: slugify(parentName) },
      update: {},
      create: { name: parentName, slug: slugify(parentName), sortOrder: parentOrder++ },
    });
    ids.set(parent.slug, parent.id);
    for (const [i, childName] of children.entries()) {
      // Child slugs are prefixed so e.g. "Saree" can't clash with a future top-level category.
      const slug = `${parent.slug}-${slugify(childName)}`;
      const child = await prisma.category.upsert({
        where: { slug },
        update: {},
        create: { name: childName, slug, parentId: parent.id, sortOrder: i },
      });
      ids.set(child.slug, child.id);
    }
  }
  return ids;
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
    categorySlug: 'bridal-lehenga',
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
    categorySlug: 'bridal-gharara',
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
    categorySlug: 'bridal-sharara',
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
    categorySlug: 'formals-maxi',
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
    categorySlug: 'menswear-sherwani',
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
      update: {},
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
  await seedProducts(categoryIds, attributeIds);

  const counts = {
    currencies: await prisma.currency.count(),
    shippingZones: await prisma.shippingZone.count(),
    shippingRates: await prisma.shippingRate.count(),
    attributes: await prisma.attribute.count(),
    attributeValues: await prisma.attributeValue.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    admins: await prisma.adminUser.count(),
  };
  console.log('Seed complete:', counts);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
