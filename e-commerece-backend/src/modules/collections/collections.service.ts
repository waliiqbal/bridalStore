import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CategoryIndexRow } from '../catalog/categories/categories.service.js';
import { CategoriesService } from '../catalog/categories/categories.service.js';
import type { CategoryIndex } from '../catalog/categories/category-tree.js';
import { AVAILABLE_VARIANT } from '../catalog/products/product-card.js';
import type { CurrencyContext } from '../pricing/currency.service.js';
import { CurrencyService } from '../pricing/currency.service.js';
import { buildCollectionWhere } from './collection-rules.js';
import {
  availableSorts,
  listCollectionProducts,
  resolveSort,
  ruleContext,
} from './collection-products.js';
import type { CollectionQueryDto } from './dto/collection.dto.js';
import {
  buildFilterWhere,
  type FilterGroup,
  type StorefrontFilters,
} from './storefront-filters.js';

const PUBLIC_SELECT = {
  id: true,
  title: true,
  slug: true,
  type: true,
  matchAllRules: true,
  rules: { select: { field: true, operator: true, value: true } },
  defaultSort: true,
  description: true,
  seoContent: true,
  noticeText: true,
  bannerImageUrl: true,
  mobileBannerImageUrl: true,
  filterAttributeIds: true,
  isPublished: true,
  seoTitle: true,
  seoDescription: true,
} satisfies Prisma.CollectionSelect;

const FACET_ATTRIBUTE_SELECT = {
  id: true,
  name: true,
  slug: true,
  values: {
    select: { id: true, value: true, slug: true },
    orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
  },
} satisfies Prisma.AttributeSelect;

type FacetAttribute = Prisma.AttributeGetPayload<{ select: typeof FACET_ATTRIBUTE_SELECT }>;

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL'];

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencies: CurrencyService,
    private readonly categories: CategoriesService,
  ) {}

  async getPublic(slug: string, query: CollectionQueryDto) {
    const [collection, currency, index, filterableAttributes] = await Promise.all([
      this.prisma.collection.findUnique({ where: { slug }, select: PUBLIC_SELECT }),
      this.currencies.resolve(query.currency),
      this.categories.loadIndex(),
      this.prisma.attribute.findMany({
        where: { isFilterable: true },
        select: FACET_ATTRIBUTE_SELECT,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    ]);
    if (!collection?.isPublished) throw new NotFoundException('Collection not found');

    const base = buildCollectionWhere(collection, ruleContext(index));
    const filters = resolveFilters(query, index, currency);
    const where: Prisma.ProductWhereInput = { AND: [base, buildFilterWhere(filters)] };
    const sort = resolveSort(query.sort ?? collection.defaultSort, collection.type);
    const facetAttributes = collection.filterAttributeIds.length
      ? filterableAttributes.filter((a) => collection.filterAttributeIds.includes(a.id))
      : filterableAttributes;

    const [products, facets] = await Promise.all([
      listCollectionProducts(this.prisma, {
        collectionId: collection.id,
        where,
        sort,
        pagination: query,
        currency,
      }),
      this.facets({ base, filters, facetAttributes, index, currency, query }),
    ]);

    const { rules: _r, matchAllRules: _m, filterAttributeIds: _f, isPublished: _p, ...info } =
      collection;
    return {
      collection: info,
      currency: currency.code,
      sort,
      sortOptions: availableSorts(collection.type),
      products,
      facets,
    };
  }

  // Facet counts: each group applies every OTHER active filter, so picking
  // "Silk" still shows how many products are Chiffon, etc. Queries run in parallel.
  private async facets(args: {
    base: Prisma.ProductWhereInput;
    filters: StorefrontFilters;
    facetAttributes: FacetAttribute[];
    index: CategoryIndex<CategoryIndexRow>;
    currency: CurrencyContext;
    query: CollectionQueryDto;
  }) {
    const { base, filters, facetAttributes, index, currency, query } = args;
    const scoped = (
      exclude: FilterGroup,
      extra?: Prisma.ProductWhereInput,
    ): Prisma.ProductWhereInput => ({
      AND: [base, buildFilterWhere(filters, exclude), ...(extra ? [extra] : [])],
    });

    const [categoryGroups, attributeGroups, sizeRows, colourRows, priceRange, onSale, readyToShip] =
      await Promise.all([
        this.prisma.product.groupBy({
          by: ['categoryId'],
          where: scoped('category'),
          _count: { _all: true },
        }),
        Promise.all(
          facetAttributes.map((attribute) =>
            this.prisma.productAttributeValue.groupBy({
              by: ['attributeValueId'],
              where: {
                attributeValue: { attributeId: attribute.id },
                product: scoped(`attr:${attribute.slug}`),
              },
              _count: { _all: true },
            }),
          ),
        ),
        // One row per (size, product) → distinct product counts per size
        this.prisma.productVariant.groupBy({
          by: ['size', 'productId'],
          where: { ...AVAILABLE_VARIANT, size: { not: null }, product: scoped('size') },
        }),
        this.prisma.productVariant.groupBy({
          by: ['colour', 'productId'],
          where: { ...AVAILABLE_VARIANT, colour: { not: null }, product: scoped('colour') },
        }),
        this.prisma.product.aggregate({
          where: scoped('price'),
          _min: { price: true },
          _max: { price: true },
        }),
        this.prisma.product.count({ where: scoped('onSale', { compareAtPrice: { not: null } }) }),
        this.prisma.product.count({ where: scoped('readyToShip', { isReadyToShip: true }) }),
      ]);

    return {
      categories: categoryFacet(categoryGroups, index, query.category ?? []),
      attributes: facetAttributes
        .map((attribute, i) => {
          const counts = new Map(
            attributeGroups[i].map((g) => [g.attributeValueId, g._count._all]),
          );
          const selected = new Set(
            (query.attr ?? [])
              .filter((pair) => pair.startsWith(`${attribute.slug}.`))
              .map((pair) => pair.slice(attribute.slug.length + 1)),
          );
          return {
            name: attribute.name,
            slug: attribute.slug,
            values: attribute.values
              .map((v) => ({
                value: v.value,
                slug: v.slug,
                count: counts.get(v.id) ?? 0,
                selected: selected.has(v.slug),
              }))
              .filter((v) => v.count > 0 || v.selected),
          };
        })
        .filter((a) => a.values.length > 0),
      sizes: optionFacet(sizeRows.map((r) => r.size), query.sizes ?? []).sort(compareSizes),
      colours: optionFacet(colourRows.map((r) => r.colour), query.colours ?? []).sort((a, b) =>
        a.value.localeCompare(b.value),
      ),
      price:
        priceRange._min.price == null || priceRange._max.price == null
          ? null
          : {
              min: currency.convert(priceRange._min.price),
              max: currency.convert(priceRange._max.price),
            },
      onSale: { count: onSale, selected: !!query.onSale },
      readyToShip: { count: readyToShip, selected: !!query.readyToShip },
    };
  }
}

function resolveFilters(
  query: CollectionQueryDto,
  index: CategoryIndex<CategoryIndexRow>,
  currency: CurrencyContext,
): StorefrontFilters {
  let categoryIds: string[] | undefined;
  if (query.category?.length) {
    const bySlug = new Map(index.rows.map((r) => [r.slug, r.id]));
    categoryIds = [
      ...new Set(
        query.category.flatMap((slug) => {
          const id = bySlug.get(slug);
          return id ? index.descendantIds(id) : [];
        }),
      ),
    ];
  }

  const attributes: Record<string, string[]> = {};
  for (const pair of query.attr ?? []) {
    const [attributeSlug, valueSlug] = pair.split('.');
    (attributes[attributeSlug] ??= []).push(valueSlug);
  }

  return {
    categoryIds,
    attributes,
    sizes: query.sizes?.length ? query.sizes : undefined,
    colours: query.colours?.length ? query.colours : undefined,
    price:
      query.minPrice != null || query.maxPrice != null
        ? currency.toAudBounds(query.minPrice, query.maxPrice)
        : undefined,
    onSale: query.onSale,
    readyToShip: query.readyToShip,
  };
}

// Counts roll up to parents, so "Bridal" includes products in "Bridal > Lehenga".
function categoryFacet(
  groups: { categoryId: string | null; _count: { _all: number } }[],
  index: CategoryIndex<CategoryIndexRow>,
  selectedSlugs: string[],
) {
  const direct = new Map(groups.map((g) => [g.categoryId, g._count._all]));
  const selected = new Set(selectedSlugs);
  return index
    .treeOrder()
    .map((row) => ({
      name: row.name,
      slug: row.slug,
      parentSlug: row.parentId ? (index.get(row.parentId)?.slug ?? null) : null,
      count: index.descendantIds(row.id).reduce((sum, id) => sum + (direct.get(id) ?? 0), 0),
      selected: selected.has(row.slug),
    }))
    .filter((c) => c.count > 0 || c.selected);
}

// Case-insensitive grouping; each row is already one distinct product.
function optionFacet(values: (string | null)[], selectedValues: string[]) {
  const options = new Map<string, { value: string; count: number; selected: boolean }>();
  const selected = new Set(selectedValues.map((v) => v.toLowerCase()));
  for (const value of values) {
    if (!value) continue;
    const key = value.toLowerCase();
    const option = options.get(key) ?? { value, count: 0, selected: selected.has(key) };
    option.count++;
    options.set(key, option);
  }
  for (const value of selectedValues) {
    const key = value.toLowerCase();
    if (!options.has(key)) options.set(key, { value, count: 0, selected: true });
  }
  return [...options.values()];
}

function compareSizes(a: { value: string }, b: { value: string }): number {
  const rank = (v: string) => {
    const i = SIZE_ORDER.indexOf(v.toUpperCase());
    return i === -1 ? Number.POSITIVE_INFINITY : i;
  };
  const [ra, rb] = [rank(a.value), rank(b.value)];
  if (ra !== rb) return ra - rb;
  const [na, nb] = [Number(a.value), Number(b.value)];
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.value.localeCompare(b.value);
}
