import { Injectable } from '@nestjs/common';
import type { CollectionSort, CollectionType, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CategoryIndexRow } from '../catalog/categories/categories.service.js';
import type { CategoryIndex } from '../catalog/categories/category-tree.js';
import { AVAILABLE_VARIANT } from '../catalog/products/product-card.js';
import type { CurrencyContext } from '../pricing/currency.service.js';
import { availableSorts, listCollectionProducts, resolveSort } from './collection-products.js';
import type { CollectionQueryDto } from './dto/collection.dto.js';
import {
  buildFilterWhere,
  type FilterGroup,
  type StorefrontFilters,
} from './storefront-filters.js';

// What is being listed: a collection or a category page.
export interface ListingSource {
  // Products in the collection/category (already limited to ACTIVE)
  base: Prisma.ProductWhereInput;
  // Hand-picked collections can use MANUAL order; categories behave like SMART
  type: CollectionType;
  collectionId?: string;
  defaultSort: CollectionSort;
  // Empty = all filterable attributes
  filterAttributeIds: string[];
}

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

/**
 * Shared storefront listing: paginated product cards, sorting, filters and
 * facets. Used by collection pages and category pages.
 */
@Injectable()
export class ListingService {
  constructor(private readonly prisma: PrismaService) {}

  async list(args: {
    source: ListingSource;
    query: CollectionQueryDto;
    currency: CurrencyContext;
    index: CategoryIndex<CategoryIndexRow>;
  }) {
    const { source, query, currency, index } = args;
    const filters = resolveFilters(query, index, currency);
    const where: Prisma.ProductWhereInput = { AND: [source.base, buildFilterWhere(filters)] };
    const sort = resolveSort(query.sort ?? source.defaultSort, source.type);

    const [products, facets] = await Promise.all([
      listCollectionProducts(this.prisma, {
        collectionId: source.collectionId ?? '',
        where,
        sort,
        pagination: query,
        currency,
      }),
      this.facets({ source, filters, index, currency, query }),
    ]);

    return {
      currency: currency.code,
      sort,
      sortOptions: availableSorts(source.type),
      products,
      facets,
    };
  }

  // Each group applies every OTHER active filter, so picking "Silk" still
  // shows how many products are Chiffon. Queries run in parallel.
  private async facets(args: {
    source: ListingSource;
    filters: StorefrontFilters;
    index: CategoryIndex<CategoryIndexRow>;
    currency: CurrencyContext;
    query: CollectionQueryDto;
  }) {
    const { source, filters, index, currency, query } = args;
    const scoped = (
      exclude: FilterGroup,
      extra?: Prisma.ProductWhereInput,
    ): Prisma.ProductWhereInput => ({
      AND: [source.base, buildFilterWhere(filters, exclude), ...(extra ? [extra] : [])],
    });

    const attributesPromise: Promise<FacetAttribute[]> = this.prisma.attribute.findMany({
      where: {
        isFilterable: true,
        ...(source.filterAttributeIds.length && { id: { in: source.filterAttributeIds } }),
      },
      select: FACET_ATTRIBUTE_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const [categoryGroups, [facetAttributes, attributeGroups], sizeRows, colourRows, priceRange, onSale, readyToShip] =
      await Promise.all([
        this.prisma.product.groupBy({
          by: ['categoryId'],
          where: scoped('category'),
          _count: { _all: true },
        }),
        attributesPromise.then(async (attributes) => {
          const groups = await Promise.all(
            attributes.map((attribute) =>
              this.prisma.productAttributeValue.groupBy({
                by: ['attributeValueId'],
                where: {
                  attributeValue: { attributeId: attribute.id },
                  product: scoped(`attr:${attribute.slug}`),
                },
                _count: { _all: true },
              }),
            ),
          );
          return [attributes, groups] as const;
        }),
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
    .filter((row) => row.isVisible)
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
