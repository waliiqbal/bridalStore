import { Injectable, NotFoundException } from '@nestjs/common';
import {
  paginate,
  toSkipTake,
  type PaginationQueryDto,
} from '../../../common/pagination/pagination.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CurrencyService } from '../../pricing/currency.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { PRODUCT_CARD_SELECT, toProductCard } from './product-card.js';

const DETAIL_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  details: true,
  price: true,
  compareAtPrice: true,
  badge: true,
  tags: true,
  isNewArrival: true,
  isReadyToShip: true,
  deliveryDays: true,
  seoTitle: true,
  seoDescription: true,
  categoryId: true,
  images: {
    select: { url: true, altText: true, colour: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
  variants: {
    where: { isActive: true },
    select: { id: true, sku: true, size: true, colour: true, price: true, stock: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
  attributes: {
    select: {
      attributeValue: {
        select: {
          value: true,
          slug: true,
          sortOrder: true,
          attribute: { select: { name: true, slug: true, sortOrder: true } },
        },
      },
    },
  },
  sizeGuide: { select: { name: true, content: true } },
} satisfies Prisma.ProductSelect;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencies: CurrencyService,
    private readonly categories: CategoriesService,
  ) {}

  async getBySlug(slug: string, currencyCode?: string) {
    const [product, currency, categoryIndex] = await Promise.all([
      this.prisma.product.findFirst({
        where: { slug, status: 'ACTIVE' },
        select: DETAIL_SELECT,
      }),
      this.currencies.resolve(currencyCode),
      this.categories.loadIndex(),
    ]);
    if (!product) throw new NotFoundException('Product not found');

    const { price, compareAtPrice, variants, attributes, categoryId, ...rest } = product;

    return {
      ...rest,
      price: currency.convert(price),
      compareAtPrice: currency.convertNullable(compareAtPrice),
      variants: variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        colour: v.colour,
        stock: v.stock,
        inStock: v.stock > 0,
        price: currency.convert(v.price ?? price),
      })),
      sizes: distinct(variants.map((v) => v.size)),
      colours: distinct(variants.map((v) => v.colour)),
      attributes: groupAttributes(attributes.map((a) => a.attributeValue)),
      breadcrumb: categoryId
        ? categoryIndex.ancestry(categoryId).map(({ name, slug: s }) => ({ name, slug: s }))
        : [],
    };
  }

  async search(q: string, pagination: PaginationQueryDto, currencyCode?: string) {
    const term = q.trim();
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        // Tags are stored lowercase, so this uses the GIN index
        { tags: { has: term.toLowerCase() } },
      ],
    };

    const [rows, total, currency] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: PRODUCT_CARD_SELECT,
        orderBy: [{ salesCount: 'desc' }, { id: 'asc' }],
        ...toSkipTake(pagination),
      }),
      this.prisma.product.count({ where }),
      this.currencies.resolve(currencyCode),
    ]);
    return paginate(
      rows.map((row) => toProductCard(row, currency)),
      total,
      pagination,
    );
  }
}

function distinct(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))];
}

type AttributeValueRow = {
  value: string;
  slug: string;
  sortOrder: number;
  attribute: { name: string; slug: string; sortOrder: number };
};

function groupAttributes(values: AttributeValueRow[]) {
  const groups = new Map<
    string,
    { name: string; slug: string; sortOrder: number; values: AttributeValueRow[] }
  >();
  for (const v of values) {
    const group = groups.get(v.attribute.slug) ?? { ...v.attribute, values: [] };
    group.values.push(v);
    groups.set(v.attribute.slug, group);
  }
  return [...groups.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((g) => ({
      name: g.name,
      slug: g.slug,
      values: g.values
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(({ value, slug }) => ({ value, slug })),
    }));
}
