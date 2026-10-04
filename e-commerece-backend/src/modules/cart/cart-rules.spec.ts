import { AUD_CONTEXT, CurrencyContext } from '../pricing/currency.service.js';
import { calculatePricing } from '../pricing/pricing.js';
import type { PricingContext } from '../pricing/pricing.service.js';
import {
  capNotice,
  capQuantity,
  lineStatus,
  MAX_QUANTITY_PER_LINE,
  planCartMerge,
} from './cart-rules.js';
import { buildCartView, pricingLines, type CartRow } from './cart-view.js';

// Prices a cart row the way CartService does (no country, no coupon).
function view(row: CartRow | null, currency: CurrencyContext) {
  const ctx: PricingContext = {
    currency,
    gstRatePercent: '10.00',
    removeGstForExports: false,
    country: null,
    zone: null,
    shippingRate: null,
    shippingIsEstimate: false,
    shippingProblem: null,
    couponCode: null,
    coupon: null,
  };
  const pricing = calculatePricing({
    lines: pricingLines(row),
    currency: currency.rate,
    gstRatePercent: ctx.gstRatePercent,
    removeGstForExports: false,
    zone: null,
    shippingRate: null,
    couponCode: null,
    coupon: null,
    now: new Date('2026-10-04T00:00:00Z'),
  });
  return buildCartView(row, pricing, ctx);
}

describe('lineStatus', () => {
  const base = { productStatus: 'ACTIVE', variantActive: true, stock: 5, quantity: 2 };

  it('is OK when the product is active and stock covers the quantity', () => {
    expect(lineStatus(base)).toEqual({ status: 'OK', availableQuantity: 5 });
    expect(lineStatus({ ...base, quantity: 5 })).toEqual({ status: 'OK', availableQuantity: 5 });
  });

  it('is LIMITED with the available quantity when stock is lower', () => {
    expect(lineStatus({ ...base, quantity: 7 })).toEqual({ status: 'LIMITED', availableQuantity: 5 });
  });

  it('is OUT_OF_STOCK with no stock', () => {
    expect(lineStatus({ ...base, stock: 0 })).toEqual({ status: 'OUT_OF_STOCK', availableQuantity: 0 });
  });

  it('is UNAVAILABLE for draft/archived products or inactive variants, before stock', () => {
    expect(lineStatus({ ...base, productStatus: 'ARCHIVED' }).status).toBe('UNAVAILABLE');
    expect(lineStatus({ ...base, productStatus: 'DRAFT', stock: 0 }).status).toBe('UNAVAILABLE');
    expect(lineStatus({ ...base, variantActive: false }).status).toBe('UNAVAILABLE');
  });

  it('never reports more available than the per-line max', () => {
    expect(lineStatus({ ...base, stock: 50 }).availableQuantity).toBe(MAX_QUANTITY_PER_LINE);
  });
});

describe('capQuantity', () => {
  it('caps by stock and by the per-line max, minimum 1', () => {
    expect(capQuantity(3, 10)).toBe(3);
    expect(capQuantity(8, 5)).toBe(5);
    expect(capQuantity(50, 100)).toBe(MAX_QUANTITY_PER_LINE);
    expect(capQuantity(0, 5)).toBe(1);
  });

  it('keeps the quantity (up to the max) when out of stock, so the line is not dropped', () => {
    expect(capQuantity(3, 0)).toBe(3);
    expect(capQuantity(30, 0)).toBe(MAX_QUANTITY_PER_LINE);
  });

  it('explains reductions', () => {
    expect(capNotice(3, 3, 10)).toBeNull();
    expect(capNotice(8, 5, 5)).toBe("Only 5 available. We've added the maximum to your bag.");
    expect(capNotice(15, 10, 40)).toBe('You can add up to 10 of each item.');
  });
});

describe('planCartMerge', () => {
  const stock = new Map([
    ['v-plenty', 20],
    ['v-few', 3],
    ['v-none', 0],
  ]);

  it('adds guest-only lines and sums shared ones', () => {
    expect(
      planCartMerge(
        [{ variantId: 'v-plenty', quantity: 2 }],
        [
          { variantId: 'v-plenty', quantity: 3 },
          { variantId: 'v-few', quantity: 1 },
        ],
        stock,
      ),
    ).toEqual([
      { variantId: 'v-plenty', quantity: 5 },
      { variantId: 'v-few', quantity: 1 },
    ]);
  });

  it('respects stock and the per-line max when summing', () => {
    expect(planCartMerge([{ variantId: 'v-few', quantity: 2 }], [{ variantId: 'v-few', quantity: 2 }], stock)).toEqual([
      { variantId: 'v-few', quantity: 3 },
    ]);
    expect(
      planCartMerge([{ variantId: 'v-plenty', quantity: 8 }], [{ variantId: 'v-plenty', quantity: 8 }], stock),
    ).toEqual([{ variantId: 'v-plenty', quantity: MAX_QUANTITY_PER_LINE }]);
  });

  it('keeps sold-out lines instead of dropping them', () => {
    expect(planCartMerge([], [{ variantId: 'v-none', quantity: 2 }], stock)).toEqual([
      { variantId: 'v-none', quantity: 2 },
    ]);
    // Shared sold-out line: keeps the larger quantity, no write if unchanged
    expect(planCartMerge([{ variantId: 'v-none', quantity: 4 }], [{ variantId: 'v-none', quantity: 1 }], stock)).toEqual([]);
  });

  it('omits customer lines that do not change', () => {
    expect(planCartMerge([{ variantId: 'v-plenty', quantity: 1 }], [], stock)).toEqual([]);
  });
});

describe('buildCartView', () => {
  const line = (id: string, overrides: { stock?: number; quantity?: number; status?: string; price?: number | null }) => ({
    id,
    quantity: overrides.quantity ?? 1,
    variant: {
      id: `v-${id}`,
      sku: `SKU-${id}`,
      size: 'M',
      colour: 'Mint',
      price: overrides.price ?? null,
      stock: overrides.stock ?? 5,
      isActive: true,
      product: {
        id: `p-${id}`,
        name: `Product ${id}`,
        slug: `product-${id}`,
        status: overrides.status ?? 'ACTIVE',
        price: 10000,
        compareAtPrice: 12000,
        images: [
          { url: 'https://x/blush.webp', altText: 'Blush', colour: 'Blush' },
          { url: 'https://x/mint.webp', altText: 'Mint', colour: 'Mint' },
        ],
      },
    },
  });
  const row = (items: ReturnType<typeof line>[]) =>
    ({ id: 'cart', token: 't', customerId: null, currencyCode: 'AUD', couponCode: null, expiresAt: new Date(), items }) as unknown as CartRow;

  it('returns an empty cart shape with zero totals', () => {
    expect(view(null, AUD_CONTEXT)).toMatchObject({
      id: null,
      items: [],
      itemCount: 0,
      canCheckout: false,
      coupon: null,
      totals: { subtotal: { amount: 0, currencyCode: 'AUD' }, discount: { amount: 0 }, shipping: null, tax: null },
      shipping: { country: null, available: null, rate: null },
    });
  });

  it('counts only OK lines in the subtotal and blocks checkout otherwise', () => {
    const cart = view(
      row([line('ok', { quantity: 2 }), line('limited', { quantity: 4, stock: 1 }), line('gone', { status: 'ARCHIVED' })]),
      AUD_CONTEXT,
    );
    expect(cart.items.map((i) => [i.status, i.lineTotal.amount])).toEqual([
      ['OK', 20000],
      ['LIMITED', 40000],
      ['UNAVAILABLE', 10000],
    ]);
    expect(cart.totals.subtotal.amount).toBe(20000);
    expect(cart.itemCount).toBe(7);
    expect(cart.canCheckout).toBe(false);
    expect(cart.items[1].message).toBe('Only 1 left. Please reduce the quantity to continue.');
  });

  it('converts each unit price and multiplies (never converts the AUD total)', () => {
    const usd = new CurrencyContext({ code: 'USD', rateFromAud: '0.650000', roundTo: 100 });
    // 999 AUD cents → 649.35 → rounds up to 700 USD cents per unit
    const cart = view(row([line('a', { quantity: 3, price: 999 })]), usd);
    expect(cart.items[0].unitPrice).toEqual({ amount: 700, currencyCode: 'USD' });
    expect(cart.items[0].lineTotal).toEqual({ amount: 2100, currencyCode: 'USD' });
    expect(cart.totals.total).toEqual({ amount: 2100, currencyCode: 'USD' });
    expect(cart.totals.totalAud).toEqual({ amount: 2997, currencyCode: 'AUD' });
    expect(cart.tax.status).toBe('CALCULATED_AT_CHECKOUT');
    expect(cart.canCheckout).toBe(true);
  });

  it('uses the variant price override and picks the image for the variant colour', () => {
    const cart = view(row([line('a', { price: 15000 })]), AUD_CONTEXT);
    expect(cart.items[0].unitPrice.amount).toBe(15000);
    // compareAt (12000) is not higher than the variant price, so no "sale" price
    expect(cart.items[0].compareAtUnitPrice).toBeNull();
    expect(cart.items[0].product.imageUrl).toBe('https://x/mint.webp');
  });
});
