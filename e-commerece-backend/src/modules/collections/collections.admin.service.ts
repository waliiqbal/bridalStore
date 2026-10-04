import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { money } from '../../common/money/money.js';
import type { PaginationQueryDto } from '../../common/pagination/pagination.js';
import { resolveSlug } from '../../common/slug/slug.js';
import { assertNoNulls, definedOnly } from '../../common/validation.js';
import type { CollectionType, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CategoriesService } from '../catalog/categories/categories.service.js';
import { AUD_CONTEXT } from '../pricing/currency.service.js';
import {
  buildCollectionWhere,
  normalizeRule,
  validateRule,
  type CollectionForWhere,
  type RuleInput,
} from './collection-rules.js';
import { listCollectionProducts, ruleContext } from './collection-products.js';
import type {
  CollectionRuleDto,
  CreateCollectionDto,
  UpdateCollectionDto,
} from './dto/collection.dto.js';

const ADMIN_DETAIL_SELECT = {
  id: true,
  title: true,
  slug: true,
  type: true,
  matchAllRules: true,
  defaultSort: true,
  description: true,
  seoContent: true,
  bannerImageUrl: true,
  mobileBannerImageUrl: true,
  noticeText: true,
  filterAttributeIds: true,
  isPublished: true,
  seoTitle: true,
  seoDescription: true,
  createdAt: true,
  updatedAt: true,
  rules: { select: { id: true, field: true, operator: true, value: true }, orderBy: { id: 'asc' } },
  products: {
    select: {
      sortOrder: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          price: true,
          images: { select: { url: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], take: 1 },
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { productId: 'asc' }],
  },
} satisfies Prisma.CollectionSelect;

@Injectable()
export class CollectionsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
  ) {}

  list() {
    return this.prisma.collection.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        isPublished: true,
        updatedAt: true,
        _count: { select: { products: true, rules: true } },
      },
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
    });
  }

  async get(id: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      select: ADMIN_DETAIL_SELECT,
    });
    if (!collection) throw new NotFoundException('Collection not found');
    return {
      ...collection,
      products: collection.products.map(({ sortOrder, product: { images, price, ...p } }) => ({
        ...p,
        sortOrder,
        price: money(price, 'AUD'),
        imageUrl: images[0]?.url ?? null,
      })),
    };
  }

  async create(dto: CreateCollectionDto) {
    const type = dto.type ?? 'MANUAL';
    assertTypeConsistent(type, dto.rules, dto.defaultSort);
    const [rules] = await Promise.all([
      type === 'SMART' ? this.validateRules(dto.rules ?? []) : [],
      this.validateFilterAttributes(dto.filterAttributeIds),
    ]);
    const slug = await resolveSlug(
      { explicit: dto.slug, source: dto.title, entity: 'collection' },
      (prefix) => this.takenSlugs(prefix),
    );
    const { rules: _rules, slug: _slug, ...fields } = dto;

    const { id } = await this.prisma.collection.create({
      data: {
        ...fields,
        type,
        slug,
        defaultSort: dto.defaultSort ?? (type === 'MANUAL' ? 'MANUAL' : 'BEST_SELLING'),
        rules: { create: rules },
      },
      select: { id: true },
    });
    return this.get(id);
  }

  async update(id: string, dto: UpdateCollectionDto) {
    assertNoNulls(dto, [
      'title',
      'slug',
      'type',
      'matchAllRules',
      'rules',
      'defaultSort',
      'filterAttributeIds',
      'isPublished',
    ]);
    const current = await this.prisma.collection.findUnique({
      where: { id },
      select: { type: true, defaultSort: true },
    });
    if (!current) throw new NotFoundException('Collection not found');

    const type = dto.type ?? current.type;
    assertTypeConsistent(type, dto.rules, dto.defaultSort);
    const [rules] = await Promise.all([
      type === 'SMART' && dto.rules ? this.validateRules(dto.rules) : undefined,
      this.validateFilterAttributes(dto.filterAttributeIds),
    ]);

    const slug =
      dto.slug === undefined
        ? undefined
        : await resolveSlug(
            { explicit: dto.slug, source: '', entity: 'collection' },
            (prefix) => this.takenSlugs(prefix, id),
          );

    // Switching type clears the other type's data.
    const switchedToManual = type === 'MANUAL' && current.type === 'SMART';
    const switchedToSmart = type === 'SMART' && current.type === 'MANUAL';
    const defaultSort =
      type === 'SMART' && (dto.defaultSort ?? current.defaultSort) === 'MANUAL'
        ? 'BEST_SELLING'
        : dto.defaultSort;
    const { rules: _rules, slug: _slug, ...fields } = dto;

    await this.prisma.collection.update({
      where: { id },
      data: definedOnly({
        ...fields,
        slug,
        defaultSort,
        rules: rules
          ? { deleteMany: {}, create: rules }
          : switchedToManual
            ? { deleteMany: {} }
            : undefined,
        products: switchedToSmart ? { deleteMany: {} } : undefined,
      }),
      select: { id: true },
    });
    return this.get(id);
  }

  async remove(id: string) {
    await this.findType(id);
    await this.prisma.collection.delete({ where: { id } });
    return { deleted: true };
  }

  async addProducts(id: string, productIds: string[]) {
    await this.assertManual(id);
    const [found, last] = await Promise.all([
      this.prisma.product.count({ where: { id: { in: productIds } } }),
      this.prisma.collectionProduct.aggregate({
        where: { collectionId: id },
        _max: { sortOrder: true },
      }),
    ]);
    if (found !== productIds.length) {
      throw new BadRequestException('One or more selected products no longer exist');
    }
    const start = (last._max.sortOrder ?? -1) + 1;
    const { count } = await this.prisma.collectionProduct.createMany({
      data: productIds.map((productId, i) => ({ collectionId: id, productId, sortOrder: start + i })),
      skipDuplicates: true,
    });
    return { added: count, alreadyInCollection: productIds.length - count };
  }

  async removeProduct(id: string, productId: string) {
    await this.assertManual(id);
    const { count } = await this.prisma.collectionProduct.deleteMany({
      where: { collectionId: id, productId },
    });
    if (!count) throw new NotFoundException('This product is not in the collection');
    return { removed: true };
  }

  async reorderProducts(id: string, productIds: string[]) {
    await this.assertManual(id);
    const found = await this.prisma.collectionProduct.count({
      where: { collectionId: id, productId: { in: productIds } },
    });
    if (found !== productIds.length) {
      throw new BadRequestException('One or more products are not in this collection');
    }
    await this.prisma.$transaction(
      productIds.map((productId, sortOrder) =>
        this.prisma.collectionProduct.update({
          where: { collectionId_productId: { collectionId: id, productId } },
          data: { sortOrder },
        }),
      ),
    );
    return { reordered: productIds.length };
  }

  // What a saved collection currently shows to shoppers (ACTIVE products only).
  async preview(id: string, pagination: PaginationQueryDto) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        matchAllRules: true,
        defaultSort: true,
        rules: { select: { field: true, operator: true, value: true } },
      },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    return this.runPreview(collection, collection.defaultSort, pagination);
  }

  // Lets the owner check smart rules before saving them.
  async previewRules(
    input: { matchAllRules?: boolean; rules: CollectionRuleDto[] },
    pagination: PaginationQueryDto,
  ) {
    const rules = await this.validateRules(input.rules);
    return this.runPreview(
      { id: 'preview', type: 'SMART', matchAllRules: input.matchAllRules ?? true, rules },
      'BEST_SELLING',
      pagination,
    );
  }

  private async runPreview(
    collection: CollectionForWhere,
    sort: Prisma.CollectionGetPayload<{ select: { defaultSort: true } }>['defaultSort'],
    pagination: PaginationQueryDto,
  ) {
    const index = await this.categories.loadIndex();
    return listCollectionProducts(this.prisma, {
      collectionId: collection.id,
      where: buildCollectionWhere(collection, ruleContext(index)),
      sort: collection.type === 'MANUAL' ? sort : sort === 'MANUAL' ? 'BEST_SELLING' : sort,
      pagination,
      currency: AUD_CONTEXT,
    });
  }

  private async validateRules(rules: CollectionRuleDto[]): Promise<RuleInput[]> {
    const normalized = rules.map((r) => normalizeRule(r));
    const errors = normalized
      .map((rule, i) => {
        const error = validateRule(rule);
        return error ? `Rule ${i + 1}: ${error}` : null;
      })
      .filter((e): e is string => e !== null);
    if (errors.length) throw new BadRequestException(errors);

    const idsFor = (field: RuleInput['field']) => [
      ...new Set(normalized.filter((r) => r.field === field).map((r) => r.value)),
    ];
    const categoryIds = idsFor('CATEGORY');
    const valueIds = idsFor('ATTRIBUTE');
    const [categories, values] = await Promise.all([
      categoryIds.length ? this.prisma.category.count({ where: { id: { in: categoryIds } } }) : 0,
      valueIds.length ? this.prisma.attributeValue.count({ where: { id: { in: valueIds } } }) : 0,
    ]);
    if (categories !== categoryIds.length) {
      throw new BadRequestException('A rule refers to a category that no longer exists');
    }
    if (values !== valueIds.length) {
      throw new BadRequestException('A rule refers to a filter option that no longer exists');
    }
    return normalized;
  }

  private async validateFilterAttributes(ids: string[] | undefined) {
    if (!ids?.length) return;
    const found = await this.prisma.attribute.count({ where: { id: { in: ids } } });
    if (found !== ids.length) {
      throw new BadRequestException('One or more selected filters no longer exist');
    }
  }

  private async findType(id: string): Promise<CollectionType> {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      select: { type: true },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    return collection.type;
  }

  private async assertManual(id: string) {
    if ((await this.findType(id)) !== 'MANUAL') {
      throw new BadRequestException(
        'Products can only be picked by hand in hand-picked (manual) collections',
      );
    }
  }

  private async takenSlugs(prefix: string, excludeId?: string) {
    const rows = await this.prisma.collection.findMany({
      where: { slug: { startsWith: prefix }, ...(excludeId && { id: { not: excludeId } }) },
      select: { slug: true },
    });
    return rows.map((r) => r.slug);
  }
}

function assertTypeConsistent(
  type: CollectionType,
  rules: CollectionRuleDto[] | undefined,
  defaultSort: string | undefined,
) {
  if (type === 'MANUAL' && rules?.length) {
    throw new BadRequestException(
      "Hand-picked collections don't use rules. Switch to an automatic (smart) collection to use rules.",
    );
  }
  if (type === 'SMART' && defaultSort === 'MANUAL') {
    throw new BadRequestException(
      'Manual order is only available for hand-picked collections',
    );
  }
}
