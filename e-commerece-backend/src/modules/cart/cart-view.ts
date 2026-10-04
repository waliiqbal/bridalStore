import type { Money } from '../../common/money/money.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { convertAudCents } from '../pricing/currency-math.js';
import type { PricingContext } from '../pricing/pricing.service.js';
import {
  percentToHundredths,
  withoutGst,
  type PricingLineInput,
  type PricingResult,
  type TaxStatus,
} from '../pricing/pricing.js';
import { LINE_MESSAGES, lineStatus, type CartLineStatus } from './cart-rules.js';

// One query (plus Prisma's batched relation loads) gives everything a cart page needs.
export const CART_VIEW_SELECT = {
  id: true,
  token: true,
  customerId: true,
  currencyCode: true,
  couponCode: true,
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
  // From PricingService. tax = GST already included in the total (GST zones only)
  totals: {
    subtotal: Money;
    discount: Money;
    shipping: Money | null;
    tax: Money | null;
    total: Money;
    totalAud: Money;
  };
  tax: { status: TaxStatus; ratePercent: string | null };
  // Export pricing only: GST removed from the prices for this destination
  gstRemovedForExport: Money | null;
  shipping: {
    country: string | null;
    // false = we don't ship to this country; null = country not known yet
    available: boolean | null;
    zone: { id: string; name: string } | null;
    rate: { id: string; name: string; estimatedDays: string | null; isFree: boolean } | null;
    // true when the cheapest rate was picked as an estimate
    isEstimate: boolean;
  };
  coupon: PricingResult['coupon'];
  // False while the bag is empty or any line is not OK
  canCheckout: boolean;
  // e.g. "Only 2 available. We've added the maximum to your bag."
  notice: string | null;
  expiresAt: Date | null;
}

// Cart lines → pricing input. Only lines with status OK are counted in totals.
export function pricingLines(row: CartRow | null): PricingLineInput[] {
  return (row?.items ?? []).map((item) => ({
    id: item.id,
    variantId: item.variant.id,
    quantity: item.quantity,
    unitPriceAud: item.variant.price ?? item.variant.product.price,
    counted:
      lineStatus({
        productStatus: item.variant.product.status,
        variantActive: item.variant.isActive,
        stock: item.variant.stock,
        quantity: item.quantity,
      }).status === 'OK',
  }));
}

/** Prices and totals come from the pricing result; this only shapes the response. */
export function buildCartView(
  row: CartRow | null,
  pricing: PricingResult,
  ctx: PricingContext,
  notice: string | null = null,
): CartView {
  const priced = new Map(pricing.lines.map((l) => [l.id, l]));
  const exportRate = pricing.gstRemovedForExport ? percentToHundredths(ctx.gstRatePercent) : null;

  const items: CartLine[] = (row?.items ?? []).map((item) => {
    const { variant } = item;
    const { product } = variant;
    const state = lineStatus({
      productStatus: product.status,
      variantActive: variant.isActive,
      stock: variant.stock,
      quantity: item.quantity,
    });
    const line = priced.get(item.id)!;
    const unitAud = variant.price ?? product.price;
    const compareAud =
      product.compareAtPrice != null && product.compareAtPrice > unitAud
        ? exportRate
          ? withoutGst(product.compareAtPrice, exportRate)
          : product.compareAtPrice
        : null;
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
      unitPrice: line.unitPrice,
      compareAtUnitPrice:
        compareAud === null
          ? null
          : { amount: convertAudCents(compareAud, ctx.currency.rate), currencyCode: pricing.currencyCode },
      lineTotal: line.lineTotal,
    };
  });

  return {
    id: row?.id ?? null,
    currencyCode: pricing.currencyCode,
    items,
    itemCount: items.reduce((sum, line) => sum + line.quantity, 0),
    totals: {
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      shipping: pricing.shipping,
      tax: pricing.tax.amount,
      total: pricing.total,
      totalAud: pricing.totalAud,
    },
    tax: { status: pricing.tax.status, ratePercent: pricing.tax.ratePercent },
    gstRemovedForExport: pricing.gstRemovedForExport,
    shipping: {
      country: ctx.country,
      available: ctx.country ? ctx.zone !== null : null,
      zone: ctx.zone ? { id: ctx.zone.id, name: ctx.zone.name } : null,
      rate: pricing.shippingRate,
      isEstimate: ctx.shippingIsEstimate,
    },
    coupon: pricing.coupon,
    canCheckout: items.length > 0 && items.every((line) => line.status === 'OK'),
    notice,
    expiresAt: row?.expiresAt ?? null,
  };
}
