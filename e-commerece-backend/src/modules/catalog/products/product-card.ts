import type { Money } from '../../../common/money/money.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import type { CurrencyContext } from '../../pricing/currency.service.js';

// A variant is purchasable when it is active and has stock. Used for card
// sizes and the size/colour filters so they always agree.
export const AVAILABLE_VARIANT = { isActive: true, stock: { gt: 0 } } as const;

export const PRODUCT_CARD_SELECT = {
  id: true,
  name: true,
  slug: true,
  price: true,
  compareAtPrice: true,
  badge: true,
  isNewArrival: true,
  isReadyToShip: true,
  images: {
    select: { url: true, altText: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    take: 2,
  },
  variants: {
    where: AVAILABLE_VARIANT,
    select: { size: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ProductSelect;

export type ProductCardRow = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_CARD_SELECT;
}>;

export interface ProductCard {
  id: string;
  name: string;
  slug: string;
  price: Money;
  compareAtPrice: Money | null;
  badge: string | null;
  isNewArrival: boolean;
  isReadyToShip: boolean;
  images: { url: string; altText: string | null }[];
  sizes: string[];
  inStock: boolean;
}

export function toProductCard(row: ProductCardRow, currency: CurrencyContext): ProductCard {
  const sizes = [...new Set(row.variants.map((v) => v.size).filter((s): s is string => !!s))];
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: currency.convert(row.price),
    compareAtPrice: currency.convertNullable(row.compareAtPrice),
    badge: row.badge,
    isNewArrival: row.isNewArrival,
    isReadyToShip: row.isReadyToShip,
    images: row.images,
    sizes,
    inStock: row.variants.length > 0,
  };
}
