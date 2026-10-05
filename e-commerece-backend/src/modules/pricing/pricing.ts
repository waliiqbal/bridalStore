// THE pricing calculation. Pure: every input is passed in (including "now"),
// so the same input always gives the same output. Cart, shipping options,
// checkout preview and checkout all call calculatePricing().

import type { Money } from '../../common/money/money.js';
import type { CouponType } from '../../generated/prisma/enums.js';
import { AUD_RATE, convertAudCents, type CurrencyRate } from './currency-math.js';

export interface PricingLineInput {
  id: string;
  variantId: string;
  quantity: number;
  // Variant price ?? product price, AUD cents, GST-inclusive
  unitPriceAud: number;
  // false for lines that can't be bought right now (not counted in totals)
  counted: boolean;
}

export interface PricingCoupon {
  id: string;
  code: string;
  type: CouponType;
  // PERCENTAGE: 10 = 10%. FIXED_AMOUNT: AUD cents. FREE_SHIPPING: ignored.
  value: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
}

export interface PricingZone {
  id: string;
  name: string;
  chargesGst: boolean;
}

export interface PricingRate {
  id: string;
  name: string;
  price: number; // AUD cents
  freeOverAmount: number | null; // AUD cents
  estimatedDays: string | null;
}

export interface PricingInput {
  lines: PricingLineInput[];
  currency: CurrencyRate;
  // StoreSettings.gstRatePercent as a decimal string, e.g. "10.00"
  gstRatePercent: string;
  removeGstForExports: boolean;
  // Zone for the ship-to country; null = country not known yet
  zone: PricingZone | null;
  shippingRate: PricingRate | null;
  // couponCode with coupon null → the code doesn't exist
  couponCode: string | null;
  coupon: PricingCoupon | null;
  now: Date;
}

export type CouponProblem = 'NOT_FOUND' | 'INACTIVE' | 'NOT_STARTED' | 'EXPIRED' | 'USED_UP' | 'MIN_ORDER';
export type TaxStatus = 'INCLUDED' | 'NOT_APPLICABLE' | 'CALCULATED_AT_CHECKOUT';

export interface PricedLine {
  id: string;
  variantId: string;
  quantity: number;
  counted: boolean;
  unitPrice: Money;
  lineTotal: Money;
  unitPriceAud: number;
  lineTotalAud: number;
}

export interface PricingResult {
  currencyCode: string;
  lines: PricedLine[];
  subtotal: Money;
  discount: Money;
  // null until a shipping rate is chosen
  shipping: Money | null;
  tax: { status: TaxStatus; amount: Money | null; ratePercent: string | null };
  // Export pricing only: GST portion removed from the goods (for display)
  gstRemovedForExport: Money | null;
  total: Money;
  totalAud: Money;
  // AUD figures, for snapshots and thresholds
  aud: { subtotal: number; discount: number; shipping: number | null; tax: number | null; total: number };
  coupon: {
    id: string | null;
    code: string;
    type: CouponType | null;
    valid: boolean;
    reason: CouponProblem | null;
    message: string | null;
  } | null;
  shippingRate: { id: string; name: string; estimatedDays: string | null; isFree: boolean } | null;
}

const HUNDREDTHS = 10_000n; // 100.00% in hundredths of a percent

// "10.00" → 1000 (hundredths of a percent)
export function percentToHundredths(rate: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(rate.trim());
  if (!match) throw new Error(`Invalid GST rate: ${rate}`);
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
}

// a / b rounded half up, for a >= 0, b > 0
const divRound = (a: bigint, b: bigint) => (2n * a + b) / (2n * b);

// GST included in a GST-inclusive amount: amount × rate / (100 + rate)
export function includedGst(amount: number, rateHundredths: bigint): number {
  if (amount <= 0 || rateHundredths === 0n) return 0;
  return Number(divRound(BigInt(amount) * rateHundredths, HUNDREDTHS + rateHundredths));
}

// Price with the GST portion removed: amount × 100 / (100 + rate)
export function withoutGst(amount: number, rateHundredths: bigint): number {
  return Number(divRound(BigInt(amount) * HUNDREDTHS, HUNDREDTHS + rateHundredths));
}

const floorTo = (amount: number, step: number) => Math.floor(amount / step) * step;

const formatAud = (cents: number) =>
  `A$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

export const COUPON_MESSAGES: Record<Exclude<CouponProblem, 'MIN_ORDER'>, string> = {
  NOT_FOUND: "This code isn't valid. Please check it and try again.",
  INACTIVE: 'This code is no longer active.',
  NOT_STARTED: "This code isn't active yet.",
  EXPIRED: 'This code has expired.',
  USED_UP: 'This code has reached its usage limit.',
};

export function couponProblem(
  coupon: PricingCoupon | null,
  subtotalAud: number,
  now: Date,
): { reason: CouponProblem; message: string } | null {
  if (!coupon) return { reason: 'NOT_FOUND', message: COUPON_MESSAGES.NOT_FOUND };
  if (!coupon.isActive) return { reason: 'INACTIVE', message: COUPON_MESSAGES.INACTIVE };
  if (coupon.startsAt && coupon.startsAt > now) return { reason: 'NOT_STARTED', message: COUPON_MESSAGES.NOT_STARTED };
  if (coupon.expiresAt && coupon.expiresAt <= now) return { reason: 'EXPIRED', message: COUPON_MESSAGES.EXPIRED };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { reason: 'USED_UP', message: COUPON_MESSAGES.USED_UP };
  }
  if (coupon.minOrderAmount !== null && subtotalAud < coupon.minOrderAmount) {
    return {
      reason: 'MIN_ORDER',
      message: `Spend ${formatAud(coupon.minOrderAmount)} or more to use this code.`,
    };
  }
  return null;
}

export function calculatePricing(input: PricingInput): PricingResult {
  const { currency } = input;
  const code = currency.code;
  const money = (amount: number): Money => ({ amount, currencyCode: code });
  const convert = (aud: number) => convertAudCents(aud, currency);
  const rate = percentToHundredths(input.gstRatePercent);

  // Export pricing: zones without GST pay ex-GST prices (only when enabled)
  const exportPricing = input.removeGstForExports && input.zone !== null && !input.zone.chargesGst;

  // ── Lines: converted unit price × quantity ──
  let gstRemoved = 0;
  const lines: PricedLine[] = input.lines.map((line) => {
    const unitAud = exportPricing ? withoutGst(line.unitPriceAud, rate) : line.unitPriceAud;
    const unit = convert(unitAud);
    if (exportPricing && line.counted) {
      gstRemoved += (convert(line.unitPriceAud) - unit) * line.quantity;
    }
    return {
      id: line.id,
      variantId: line.variantId,
      quantity: line.quantity,
      counted: line.counted,
      unitPrice: money(unit),
      lineTotal: money(unit * line.quantity),
      unitPriceAud: unitAud,
      lineTotalAud: unitAud * line.quantity,
    };
  });
  const counted = lines.filter((l) => l.counted);
  const subtotal = counted.reduce((sum, l) => sum + l.lineTotal.amount, 0);
  const subtotalAud = counted.reduce((sum, l) => sum + l.lineTotalAud, 0);

  // ── Coupon (one per cart) ──
  let discount = 0;
  let discountAud = 0;
  let freeShippingCoupon = false;
  let couponResult: PricingResult['coupon'] = null;
  if (input.couponCode) {
    const problem = couponProblem(input.coupon, subtotalAud, input.now);
    const coupon = input.coupon;
    if (!problem && coupon) {
      if (coupon.type === 'PERCENTAGE') {
        const pct = Math.min(Math.max(coupon.value, 0), 100);
        // Rounded down to the currency's step: never over-discounts, totals stay on the step
        discount = floorTo((subtotal * pct) / 100, currency.roundTo);
        discountAud = Math.floor((subtotalAud * pct) / 100);
      } else if (coupon.type === 'FIXED_AMOUNT') {
        discount = convert(Math.max(coupon.value, 0));
        discountAud = Math.max(coupon.value, 0);
      } else {
        freeShippingCoupon = true;
      }
      // Never more than the goods
      discount = Math.min(discount, subtotal);
      discountAud = Math.min(discountAud, subtotalAud);
    }
    couponResult = {
      id: coupon?.id ?? null,
      code: coupon?.code ?? input.couponCode,
      type: coupon?.type ?? null,
      valid: !problem,
      reason: problem?.reason ?? null,
      message: problem?.message ?? null,
    };
  }

  // ── Shipping: free over the threshold (AUD, after discount) or with a free-shipping coupon ──
  let shipping: number | null = null;
  let shippingAud: number | null = null;
  let shippingRate: PricingResult['shippingRate'] = null;
  if (input.shippingRate) {
    const r = input.shippingRate;
    const isFree =
      freeShippingCoupon || (r.freeOverAmount !== null && subtotalAud - discountAud >= r.freeOverAmount);
    shipping = isFree ? 0 : convert(r.price);
    shippingAud = isFree ? 0 : r.price;
    shippingRate = { id: r.id, name: r.name, estimatedDays: r.estimatedDays, isFree };
  }

  const total = subtotal - discount + (shipping ?? 0);
  const totalAud = subtotalAud - discountAud + (shippingAud ?? 0);

  // ── GST: the portion already included in the price, GST zones only ──
  let tax: PricingResult['tax'];
  let taxAud: number | null = null;
  if (!input.zone) {
    tax = { status: 'CALCULATED_AT_CHECKOUT', amount: null, ratePercent: null };
  } else if (input.zone.chargesGst) {
    tax = { status: 'INCLUDED', amount: money(includedGst(total, rate)), ratePercent: input.gstRatePercent };
    taxAud = includedGst(totalAud, rate);
  } else {
    tax = { status: 'NOT_APPLICABLE', amount: null, ratePercent: null };
  }

  return {
    currencyCode: code,
    lines,
    subtotal: money(subtotal),
    discount: money(discount),
    shipping: shipping === null ? null : money(shipping),
    tax,
    gstRemovedForExport: exportPricing ? money(gstRemoved) : null,
    total: money(total),
    totalAud: { amount: totalAud, currencyCode: AUD_RATE.code },
    aud: { subtotal: subtotalAud, discount: discountAud, shipping: shippingAud, tax: taxAud, total: totalAud },
    coupon: couponResult,
    shippingRate,
  };
}

/** Which zone ships to a country: the zone listing it, else the fallback zone. */
export function zoneForCountry<Z extends { countryCodes: string[]; isFallback: boolean }>(
  zones: Z[],
  countryCode: string,
): Z | null {
  return zones.find((z) => z.countryCodes.includes(countryCode)) ?? zones.find((z) => z.isFallback) ?? null;
}

/**
 * Every rate of a zone, converted, with whether it is free for this basket
 * (free-shipping coupon, or AUD goods after discount over the threshold).
 */
export function shippingOptionsFor(rates: PricingRate[], currency: CurrencyRate, priced: PricingResult) {
  const goodsAud = priced.aud.subtotal - priced.aud.discount;
  const freeShippingCoupon = priced.coupon?.valid === true && priced.coupon.type === 'FREE_SHIPPING';
  const m = (amount: number): Money => ({ amount: convertAudCents(amount, currency), currencyCode: currency.code });
  return rates.map((r) => ({
    id: r.id,
    name: r.name,
    estimatedDays: r.estimatedDays,
    price: m(r.price),
    isFree: freeShippingCoupon || (r.freeOverAmount !== null && goodsAud >= r.freeOverAmount),
    freeOver: r.freeOverAmount === null ? null : m(r.freeOverAmount),
  }));
}
