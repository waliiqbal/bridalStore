import type { Prisma } from '../../generated/prisma/client.js';
import { AVAILABLE_VARIANT } from '../catalog/products/product-card.js';

// Filters after resolving slugs/currency. undefined = filter not used.
export interface StorefrontFilters {
  // Selected categories plus their sub-categories ([] = unknown slug → no matches)
  categoryIds?: string[];
  // Attribute slug → selected value slugs, e.g. { fabric: ['chiffon', 'silk'] }
  attributes?: Record<string, string[]>;
  sizes?: string[];
  colours?: string[];
  // AUD cents, already converted from the shopper's currency
  price?: { gte?: number; lte?: number };
  onSale?: boolean;
  readyToShip?: boolean;
}

// Facet groups. Each attribute is its own group: "attr:<slug>".
export type FilterGroup =
  | 'category'
  | 'size'
  | 'colour'
  | 'price'
  | 'onSale'
  | 'readyToShip'
  | `attr:${string}`;

const anyVariant = (column: 'size' | 'colour', values: string[]): Prisma.ProductWhereInput => ({
  variants: {
    some: {
      ...AVAILABLE_VARIANT,
      OR: values.map((v) => ({ [column]: { equals: v, mode: 'insensitive' } })),
    },
  },
});

// Values within a group are ORed; groups are ANDed together.
export function buildFilterClauses(f: StorefrontFilters): Map<FilterGroup, Prisma.ProductWhereInput> {
  const clauses = new Map<FilterGroup, Prisma.ProductWhereInput>();

  if (f.categoryIds !== undefined) {
    clauses.set('category', { categoryId: { in: f.categoryIds } });
  }
  for (const [attributeSlug, valueSlugs] of Object.entries(f.attributes ?? {})) {
    if (valueSlugs.length === 0) continue;
    clauses.set(`attr:${attributeSlug}`, {
      attributes: {
        some: { attributeValue: { attribute: { slug: attributeSlug }, slug: { in: valueSlugs } } },
      },
    });
  }
  if (f.sizes?.length) clauses.set('size', anyVariant('size', f.sizes));
  if (f.colours?.length) clauses.set('colour', anyVariant('colour', f.colours));
  if (f.price && (f.price.gte !== undefined || f.price.lte !== undefined)) {
    const price: Prisma.IntFilter = {};
    if (f.price.gte !== undefined) price.gte = f.price.gte;
    if (f.price.lte !== undefined) price.lte = f.price.lte;
    clauses.set('price', { price });
  }
  if (f.onSale) clauses.set('onSale', { compareAtPrice: { not: null } });
  if (f.readyToShip) clauses.set('readyToShip', { isReadyToShip: true });

  return clauses;
}

/**
 * Storefront filter as a Prisma where. Pass `exclude` to drop one group —
 * facet counts for a group apply every OTHER active filter.
 */
export function buildFilterWhere(
  filters: StorefrontFilters,
  exclude?: FilterGroup,
): Prisma.ProductWhereInput {
  const clauses = [...buildFilterClauses(filters)]
    .filter(([group]) => group !== exclude)
    .map(([, where]) => where);
  return { AND: clauses };
}
