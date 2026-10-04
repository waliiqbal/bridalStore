import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { money } from '../../../common/money/money.js';
import { paginate, toSkipTake } from '../../../common/pagination/pagination.js';
import { resolveSlug } from '../../../common/slug/slug.js';
import { assertNoNulls, definedOnly } from '../../../common/validation.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import type {
  AdminProductListQueryDto,
  CreateProductDto,
  ProductImageInputDto,
  UpdateProductDto,
} from './dto/product.dto.js';

const aud = (cents: number) => money(cents, 'AUD');
const audOrNull = (cents: number | null) => (cents == null ? null : aud(cents));

export function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

const ADMIN_DETAIL_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  details: true,
  status: true,
  price: true,
  compareAtPrice: true,
  isFeatured: true,
  isNewArrival: true,
  isReadyToShip: true,
  deliveryDays: true,
  badge: true,
  tags: true,
  salesCount: true,
  seoTitle: true,
  seoDescription: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  sizeGuide: { select: { id: true, name: true } },
  images: {
    select: { id: true, url: true, altText: true, colour: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
  attributes: {
    select: {
      attributeValue: {
        select: { id: true, value: true, attribute: { select: { id: true, name: true } } },
      },
    },
  },
  variants: {
    select: {
      id: true,
      sku: true,
      size: true,
      colour: true,
      price: true,
      stock: true,
      isActive: true,
      sortOrder: true,
      _count: { select: { orderItems: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ProductSelect;

@Injectable()
export class ProductsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
  ) {}

  async list(query: AdminProductListQueryDto) {
    const where: Prisma.ProductWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.categoryId) {
      const index = await this.categories.loadIndex();
      where.categoryId = { in: index.descendantIds(query.categoryId) };
    }
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { slug: { contains: query.q, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: query.q, mode: 'insensitive' } } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          price: true,
          compareAtPrice: true,
          updatedAt: true,
          category: { select: { id: true, name: true } },
          images: { select: { url: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], take: 1 },
          variants: { select: { stock: true, isActive: true } },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        ...toSkipTake(query),
      }),
      this.prisma.product.count({ where }),
    ]);

    const items = rows.map(({ images, variants, price, compareAtPrice, ...row }) => ({
      ...row,
      price: aud(price),
      compareAtPrice: audOrNull(compareAtPrice),
      imageUrl: images[0]?.url ?? null,
      variantCount: variants.length,
      totalStock: variants.filter((v) => v.isActive).reduce((sum, v) => sum + v.stock, 0),
    }));
    return paginate(items, total, query);
  }

  async get(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: ADMIN_DETAIL_SELECT,
    });
    if (!product) throw new NotFoundException('Product not found');

    const { price, compareAtPrice, attributes, variants, ...rest } = product;
    return {
      ...rest,
      price: aud(price),
      compareAtPrice: audOrNull(compareAtPrice),
      attributeValues: attributes.map(({ attributeValue: v }) => ({
        id: v.id,
        value: v.value,
        attributeId: v.attribute.id,
        attributeName: v.attribute.name,
      })),
      variants: variants.map(({ _count, price: variantPrice, ...v }) => ({
        ...v,
        price: audOrNull(variantPrice),
        effectivePrice: aud(variantPrice ?? price),
        // Variants that appear in orders can only be deactivated
        canDelete: _count.orderItems === 0,
      })),
    };
  }

  async create(dto: CreateProductDto) {
    assertSalePrice(dto.price, dto.compareAtPrice);
    await this.validateReferences(dto);

    const slug = await resolveSlug(
      { explicit: dto.slug, source: dto.name, entity: 'product' },
      (prefix) => this.takenSlugs(prefix),
    );
    const { images, attributeValueIds, tags, slug: _slug, ...fields } = dto;

    const { id } = await this.prisma.product.create({
      data: {
        ...fields,
        slug,
        tags: normalizeTags(tags ?? []),
        images: images && { create: imageRows(images) },
        attributes: attributeValueIds && {
          create: attributeValueIds.map((attributeValueId) => ({ attributeValueId })),
        },
      },
      select: { id: true },
    });
    return this.get(id);
  }

  async update(id: string, dto: UpdateProductDto) {
    assertNoNulls(dto, [
      'name',
      'slug',
      'price',
      'status',
      'isFeatured',
      'isNewArrival',
      'isReadyToShip',
      'tags',
      'images',
      'attributeValueIds',
    ]);
    const current = await this.prisma.product.findUnique({
      where: { id },
      select: { price: true, compareAtPrice: true },
    });
    if (!current) throw new NotFoundException('Product not found');

    assertSalePrice(
      dto.price ?? current.price,
      dto.compareAtPrice === undefined ? current.compareAtPrice : dto.compareAtPrice,
    );
    await this.validateReferences(dto);

    const slug =
      dto.slug === undefined
        ? undefined
        : await resolveSlug(
            { explicit: dto.slug, source: '', entity: 'product' },
            (prefix) => this.takenSlugs(prefix, id),
          );
    const { images, attributeValueIds, tags, slug: _slug, ...fields } = dto;

    // One update call: nested deleteMany + create replace images/filters atomically.
    await this.prisma.product.update({
      where: { id },
      data: definedOnly({
        ...fields,
        slug,
        tags: tags && normalizeTags(tags),
        images: images && { deleteMany: {}, create: imageRows(images) },
        attributes: attributeValueIds && {
          deleteMany: {},
          create: attributeValueIds.map((attributeValueId) => ({ attributeValueId })),
        },
      }),
      select: { id: true },
    });
    return this.get(id);
  }

  // Orders keep a snapshot, but variants used in orders must never be deleted,
  // so a product with order history is archived (hidden from the shop) instead.
  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');

    const ordered = await this.prisma.orderItem.count({ where: { variant: { productId: id } } });
    if (ordered > 0) {
      await this.prisma.product.update({ where: { id }, data: { status: 'ARCHIVED' } });
      return {
        deleted: false,
        archived: true,
        message:
          'This product has past orders, so it was archived instead of deleted. It is now hidden from the shop.',
      };
    }

    await this.prisma.product.delete({ where: { id } });
    return { deleted: true, archived: false };
  }

  private async validateReferences(dto: UpdateProductDto) {
    const ids = dto.attributeValueIds ?? [];
    const [category, sizeGuide, values] = await Promise.all([
      dto.categoryId ? this.prisma.category.count({ where: { id: dto.categoryId } }) : 1,
      dto.sizeGuideId ? this.prisma.sizeGuide.count({ where: { id: dto.sizeGuideId } }) : 1,
      ids.length ? this.prisma.attributeValue.count({ where: { id: { in: ids } } }) : 0,
    ]);
    if (!category) throw new BadRequestException('The selected category does not exist');
    if (!sizeGuide) throw new BadRequestException('The selected size guide does not exist');
    if (values !== ids.length) {
      throw new BadRequestException('One or more selected filter options no longer exist');
    }
  }

  private async takenSlugs(prefix: string, excludeId?: string) {
    const rows = await this.prisma.product.findMany({
      where: { slug: { startsWith: prefix }, ...(excludeId && { id: { not: excludeId } }) },
      select: { slug: true },
    });
    return rows.map((r) => r.slug);
  }
}

function assertSalePrice(price: number, compareAtPrice: number | null | undefined) {
  if (compareAtPrice != null && compareAtPrice <= price) {
    throw new BadRequestException(
      'The original (crossed-out) price must be higher than the selling price',
    );
  }
}

function imageRows(images: ProductImageInputDto[]) {
  return images.map((image, sortOrder) => ({
    url: image.url,
    altText: image.altText ?? null,
    colour: image.colour ?? null,
    sortOrder,
  }));
}
