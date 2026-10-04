import type { Money } from '../../common/money/money.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { CurrencyContext } from '../pricing/currency.service.js';
import { LINE_MESSAGES, lineStatus, type CartLineStatus } from './cart-rules.js';

// One query (plus Prisma's batched relation loads) gives everything a cart page needs.
export const CART_VIEW_SELECT = {
  id: true,
  token: true,
  customerId: true,
  currencyCode: true,
  expiresAt: true,
  items: {
    select: {
      id: true,
      quantity: true,
      variant: {
        select: {
          id: true,
          sku: true,
          size: true,
          colour: true,
          price: true,
          stock: true,
          isActive: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              price: true,
              compareAtPrice: true,
              images: {
                select: { url: true, altText: true, colour: true },
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                take: 10,
              },
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.CartSelect;

export type CartRow = Prisma.CartGetPayload<{ select: typeof CART_VIEW_SELECT }>;

export interface CartLine {
  id: string;
  variantId: string;
  quantity: number;
  status: CartLineStatus;
  availableQuantity: number;
  message: string | null;
  product: { id: string; name: string; slug: string; imageUrl: string | null; imageAlt: string | null };
  sku: string;
  size: string | null;
  colour: string | null;
  unitPrice: Money;
  compareAtUnitPrice: Money | null;
  lineTotal: Money;
}

export interface CartView {
  id: string | null;
  currencyCode: string;
  items: CartLine[];
  // Total pieces in the bag (for the header badge)
  itemCount: number;
  // discount, shipping and tax are filled in by phase 5 pricing
  totals: {
    subtotal: Money;
    discount: Money | null;
    shipping: Money | null;
    tax: Money | null;
    total: Money;
  };
  coupon: null;
  // False while the bag is empty or any line is not OK
  canCheckout: boolean;
  // e.g. "Only 2 available. We've added the maximum to your bag."
  notice: string | null;
  expiresAt: Date | null;
}

/**
 * Prices always come from the database, converted per unit:
 * lineTotal = convert(unit AUD price) × quantity. Only OK lines count
 * towards the subtotal; any other line blocks checkout.
 */
export function buildCartView(
  row: CartRow | null,
  currency: CurrencyContext,
  notice: string | null = null,
): CartView {
  const zero = currency.convert(0);
  if (!row) {
    return {
      id: null,
      currencyCode: currency.code,
      items: [],
      itemCount: 0,
      totals: { subtotal: zero, discount: null, shipping: null, tax: null, total: zero },
      coupon: null,
      canCheckout: false,
      notice,
      expiresAt: null,
    };
  }

  const items: CartLine[] = row.items.map((item) => {
    const { variant } = item;
    const { product } = variant;
    const state = lineStatus({
      productStatus: product.status,
      variantActive: variant.isActive,
      stock: variant.stock,
      quantity: item.quantity,
    });
    const unitAud = variant.price ?? product.price;
    const unitPrice = currency.convert(unitAud);
    const image =
      product.images.find((img) => variant.colour && img.colour === variant.colour) ?? product.images[0];

    return {
      id: item.id,
      variantId: variant.id,
      quantity: item.quantity,
      status: state.status,
      availableQuantity: state.availableQuantity,
      message: LINE_MESSAGES[state.status](state.availableQuantity),
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        imageUrl: image?.url ?? null,
        imageAlt: image?.altText ?? null,
      },
      sku: variant.sku,
      size: variant.size,
      colour: variant.colour,
      unitPrice,
      compareAtUnitPrice:
        product.compareAtPrice != null && product.compareAtPrice > unitAud
          ? currency.convert(product.compareAtPrice)
          : null,
      lineTotal: { amount: unitPrice.amount * item.quantity, currencyCode: currency.code },
    };
  });

  const subtotal = items
    .filter((line) => line.status === 'OK')
    .reduce((sum, line) => sum + line.lineTotal.amount, 0);
  const subtotalMoney = { amount: subtotal, currencyCode: currency.code };

  return {
    id: row.id,
    currencyCode: currency.code,
    items,
    itemCount: items.reduce((sum, line) => sum + line.quantity, 0),
    totals: { subtotal: subtotalMoney, discount: null, shipping: null, tax: null, total: subtotalMoney },
    coupon: null,
    canCheckout: items.length > 0 && items.every((line) => line.status === 'OK'),
    notice,
    expiresAt: row.expiresAt,
  };
}
