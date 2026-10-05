import { AUD_RATE, type CurrencyRate } from './currency-math.js';
import {
  calculatePricing,
  couponProblem,
  includedGst,
  percentToHundredths,
  withoutGst,
  zoneForCountry,
  type PricingCoupon,
  type PricingInput,
} from './pricing.js';

const NOW = new Date('2026-10-04T12:00:00Z');
const USD: CurrencyRate = { code: 'USD', rateFromAud: '0.650000', roundTo: 100 };
const GBP: CurrencyRate = { code: 'GBP', rateFromAud: '0.520000', roundTo: 100 };
const NZD_CENTS: CurrencyRate = { code: 'NZD', rateFromAud: '1.090000', roundTo: 1 };

const AU = { id: 'z-au', name: 'Australia', chargesGst: true };
const UK = { id: 'z-uk', name: 'United Kingdom', chargesGst: false };
const standard = { id: 'r1', name: 'Standard', price: 1500, freeOverAmount: 30000, estimatedDays: '3–7 days' };

const line = (id: string, unitPriceAud: number, quantity = 1, counted = true) => ({
  id,
  variantId: `v-${id}`,
  quantity,
  unitPriceAud,
  counted,
});

const coupon = (overrides: Partial<PricingCoupon> = {}): PricingCoupon => ({
  id: 'c1',
  code: 'EID10',
  type: 'PERCENTAGE',
  value: 10,
  minOrderAmount: null,
  maxUses: null,
  usedCount: 0,
  startsAt: null,
  expiresAt: null,
  isActive: true,
  ...overrides,
});

const input = (overrides: Partial<PricingInput> = {}): PricingInput => ({
  lines: [line('a', 24990), line('b', 4999, 2)],
  currency: AUD_RATE,
  gstRatePercent: '10.00',
  removeGstForExports: false,
  zone: AU,
  shippingRate: null,
  couponCode: null,
  coupon: null,
  now: NOW,
  ...overrides,
});

describe('GST helpers', () => {
  it('parses the rate and computes the GST included in a price', () => {
    expect(percentToHundredths('10.00')).toBe(1000n);
    expect(percentToHundredths('15')).toBe(1500n);
    expect(percentToHundredths('12.5')).toBe(1250n);
    expect(includedGst(11000, 1000n)).toBe(1000); // $110 incl. → $10 GST
    expect(includedGst(9999, 1000n)).toBe(909); // 909.0 → 909
    expect(includedGst(10000, 1000n)).toBe(909); // 909.09 → 909
    expect(includedGst(10005, 1000n)).toBe(910); // 909.545 → 910 (half up)
    expect(includedGst(0, 1000n)).toBe(0);
    expect(withoutGst(11000, 1000n)).toBe(10000);
  });
});

describe('calculatePricing — lines and subtotal', () => {
  it('sums converted unit price × quantity (AUD unchanged)', () => {
    const r = calculatePricing(input());
    expect(r.lines.map((l) => [l.unitPrice.amount, l.lineTotal.amount])).toEqual([
      [24990, 24990],
      [4999, 9998],
    ]);
    expect(r.subtotal).toEqual({ amount: 34988, currencyCode: 'AUD' });
    expect(r.total.amount).toBe(34988);
  });

  it('converts each unit with the same rounding as listings', () => {
    const r = calculatePricing(input({ currency: USD }));
    // 24990 × 0.65 = 16243.5 → 16300; 4999 × 0.65 = 3249.35 → 3300
    expect(r.lines.map((l) => l.unitPrice.amount)).toEqual([16300, 3300]);
    expect(r.subtotal).toEqual({ amount: 16300 + 6600, currencyCode: 'USD' });
    expect(r.totalAud).toEqual({ amount: 34988, currencyCode: 'AUD' });
  });

  it('leaves out lines that cannot be bought', () => {
    const r = calculatePricing(input({ lines: [line('a', 10000), line('gone', 50000, 1, false)] }));
    expect(r.subtotal.amount).toBe(10000);
    expect(r.lines[1].lineTotal.amount).toBe(50000); // still priced for display
  });

  it('handles an empty cart', () => {
    const r = calculatePricing(input({ lines: [] }));
    expect(r.subtotal.amount).toBe(0);
    expect(r.total.amount).toBe(0);
  });
});

describe('calculatePricing — coupons', () => {
  it('PERCENTAGE applies to the subtotal', () => {
    const r = calculatePricing(input({ couponCode: 'EID10', coupon: coupon() }));
    expect(r.discount.amount).toBe(3498); // floor(34988 × 10%)
    expect(r.total.amount).toBe(34988 - 3498);
    expect(r.coupon).toMatchObject({ code: 'EID10', valid: true, reason: null });
  });

  it('PERCENTAGE rounds down to the currency step', () => {
    const r = calculatePricing(input({ currency: USD, couponCode: 'EID10', coupon: coupon() }));
    // subtotal 22900 × 10% = 2290 → 2200 (whole dollars)
    expect(r.discount.amount).toBe(2200);
    expect(r.aud.discount).toBe(3498);
  });

  it('FIXED_AMOUNT is stored in AUD and converted', () => {
    const fixed = coupon({ code: 'NIKAH50', type: 'FIXED_AMOUNT', value: 5000 });
    expect(calculatePricing(input({ couponCode: 'NIKAH50', coupon: fixed })).discount.amount).toBe(5000);
    // 5000 × 0.65 = 3250 → 3300 USD cents
    expect(calculatePricing(input({ currency: USD, couponCode: 'NIKAH50', coupon: fixed })).discount.amount).toBe(3300);
  });

  it('a discount never exceeds the subtotal', () => {
    const big = coupon({ type: 'FIXED_AMOUNT', value: 1_000_000 });
    const r = calculatePricing(input({ couponCode: 'BIG', coupon: big }));
    expect(r.discount.amount).toBe(r.subtotal.amount);
    expect(r.total.amount).toBe(0);
    const over = calculatePricing(input({ couponCode: 'X', coupon: coupon({ value: 150 }) }));
    expect(over.discount.amount).toBe(over.subtotal.amount);
  });

  it('FREE_SHIPPING zeroes shipping and nothing else', () => {
    const r = calculatePricing(
      input({ shippingRate: { ...standard, freeOverAmount: null }, couponCode: 'SHIP', coupon: coupon({ type: 'FREE_SHIPPING', value: 0 }) }),
    );
    expect(r.discount.amount).toBe(0);
    expect(r.shipping?.amount).toBe(0);
    expect(r.shippingRate?.isFree).toBe(true);
  });

  it('gives a clear reason when a coupon is invalid, and applies no discount', () => {
    const cases: [Partial<PricingCoupon> | null, string, RegExp][] = [
      [null, 'NOT_FOUND', /isn't valid/],
      [{ isActive: false }, 'INACTIVE', /no longer active/],
      [{ startsAt: new Date(NOW.getTime() + 1000) }, 'NOT_STARTED', /isn't active yet/],
      [{ expiresAt: NOW }, 'EXPIRED', /expired/],
      [{ maxUses: 5, usedCount: 5 }, 'USED_UP', /usage limit/],
      [{ minOrderAmount: 50000 }, 'MIN_ORDER', /Spend A\$500 or more/],
    ];
    for (const [overrides, reason, message] of cases) {
      const r = calculatePricing(input({ couponCode: 'CODE', coupon: overrides ? coupon(overrides) : null }));
      expect(r.coupon).toMatchObject({ valid: false, reason });
      expect(r.coupon?.message).toMatch(message);
      expect(r.discount.amount).toBe(0);
    }
  });

  it('compares the minimum order with the AUD subtotal, whatever the currency', () => {
    const min = coupon({ minOrderAmount: 34988 });
    expect(calculatePricing(input({ currency: USD, couponCode: 'X', coupon: min })).coupon?.valid).toBe(true);
    expect(couponProblem(coupon({ minOrderAmount: 34989 }), 34988, NOW)?.reason).toBe('MIN_ORDER');
  });
});

describe('calculatePricing — shipping', () => {
  it('charges the converted rate price until the AUD threshold is reached', () => {
    const cheap = input({ lines: [line('a', 10000)], shippingRate: standard });
    expect(calculatePricing(cheap).shipping?.amount).toBe(1500);
    expect(calculatePricing({ ...cheap, currency: USD }).shipping?.amount).toBe(1000); // 975 → 1000
    expect(calculatePricing({ ...cheap, lines: [line('a', 30000)] }).shipping?.amount).toBe(0);
  });

  it('uses the subtotal after discount for the threshold', () => {
    const r = calculatePricing(
      input({ lines: [line('a', 30000)], shippingRate: standard, couponCode: 'EID10', coupon: coupon() }),
    );
    // 30000 − 3000 = 27000 < 30000 → shipping charged
    expect(r.shippingRate?.isFree).toBe(false);
    expect(r.total.amount).toBe(30000 - 3000 + 1500);
  });

  it('shipping is null until a rate is chosen', () => {
    expect(calculatePricing(input()).shipping).toBeNull();
  });
});

describe('calculatePricing — GST', () => {
  it('includes GST for GST zones, on goods after discount plus shipping', () => {
    const r = calculatePricing(input({ lines: [line('a', 10000)], shippingRate: standard }));
    expect(r.total.amount).toBe(11500);
    expect(r.tax).toEqual({
      status: 'INCLUDED',
      amount: { amount: 1045, currencyCode: 'AUD' }, // 11500 / 11 = 1045.45
      ratePercent: '10.00',
    });
  });

  it('no GST outside GST zones', () => {
    const r = calculatePricing(input({ zone: UK, currency: GBP }));
    expect(r.tax).toEqual({ status: 'NOT_APPLICABLE', amount: null, ratePercent: null });
  });

  it('unknown country: GST is calculated at checkout', () => {
    expect(calculatePricing(input({ zone: null })).tax.status).toBe('CALCULATED_AT_CHECKOUT');
  });

  it('uses the configured rate', () => {
    const r = calculatePricing(input({ lines: [line('a', 11500)], gstRatePercent: '15.00' }));
    expect(r.tax.amount?.amount).toBe(1500);
  });

  it('removeGstForExports: export zones pay ex-GST prices, GST zones are unchanged', () => {
    const exportInput = input({ lines: [line('a', 11000, 2)], zone: UK, removeGstForExports: true });
    const r = calculatePricing(exportInput);
    expect(r.lines[0].unitPrice.amount).toBe(10000);
    expect(r.subtotal.amount).toBe(20000);
    expect(r.gstRemovedForExport).toEqual({ amount: 2000, currencyCode: 'AUD' });
    expect(r.tax.status).toBe('NOT_APPLICABLE');

    const domestic = calculatePricing({ ...exportInput, zone: AU });
    expect(domestic.subtotal.amount).toBe(22000);
    expect(domestic.gstRemovedForExport).toBeNull();
    // Off: export zones pay the normal price
    expect(calculatePricing({ ...exportInput, removeGstForExports: false }).subtotal.amount).toBe(22000);
  });
});

describe('calculatePricing — invariants', () => {
  const currencies = [AUD_RATE, USD, GBP, NZD_CENTS];
  const coupons: (PricingCoupon | null)[] = [
    null,
    coupon(),
    coupon({ value: 33 }),
    coupon({ type: 'FIXED_AMOUNT', value: 2550 }),
    coupon({ type: 'FREE_SHIPPING', value: 0 }),
    coupon({ type: 'FIXED_AMOUNT', value: 99_999_999 }),
  ];
  const baskets = [
    [line('a', 24990), line('b', 4999, 3)],
    [line('a', 1)],
    [line('a', 999, 10), line('b', 189900)],
    [],
  ];
  const rates = [null, standard, { ...standard, price: 6000, freeOverAmount: null }];

  it('total = subtotal − discount + shipping, never negative, on the currency step, deterministic', () => {
    for (const currency of currencies)
      for (const c of coupons)
        for (const lines of baskets)
          for (const shippingRate of rates)
            for (const zone of [AU, UK, null]) {
              const params = input({ currency, lines, shippingRate, zone, couponCode: c ? c.code : null, coupon: c });
              const r = calculatePricing(params);
              const { subtotal, discount, shipping, total } = r;
              expect(total.amount).toBe(subtotal.amount - discount.amount + (shipping?.amount ?? 0));
              expect(r.aud.total).toBe(r.aud.subtotal - r.aud.discount + (r.aud.shipping ?? 0));
              for (const m of [subtotal, discount, total, r.totalAud]) expect(m.amount).toBeGreaterThanOrEqual(0);
              expect(discount.amount).toBeLessThanOrEqual(subtotal.amount);
              for (const m of [subtotal, discount, shipping, total]) {
                if (m) expect(m.amount % currency.roundTo).toBe(0);
              }
              expect(r.tax.amount?.amount ?? 0).toBeLessThanOrEqual(total.amount);
              expect(calculatePricing(params)).toEqual(r);
            }
  });
});

describe('zoneForCountry', () => {
  const zones = [
    { id: 'au', countryCodes: ['AU'], isFallback: false },
    { id: 'row', countryCodes: [], isFallback: true },
  ];
  it('finds the listing zone, else the fallback, else nothing', () => {
    expect(zoneForCountry(zones, 'AU')?.id).toBe('au');
    expect(zoneForCountry(zones, 'PK')?.id).toBe('row');
    expect(zoneForCountry([zones[0]], 'PK')).toBeNull();
  });
});
