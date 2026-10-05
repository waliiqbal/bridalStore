import {
  AUD_RATE,
  convertAudCents,
  maxAudCentsFor,
  minAudCentsFor,
  rateToMicros,
  type CurrencyRate,
} from './currency-math.js';

const usd = (roundTo: number, rateFromAud = '0.650000'): CurrencyRate => ({
  code: 'USD',
  rateFromAud,
  roundTo,
});

describe('convertAudCents', () => {
  it('returns AUD amounts unchanged, even when not whole dollars', () => {
    expect(convertAudCents(24999, AUD_RATE)).toBe(24999);
    expect(convertAudCents(0, AUD_RATE)).toBe(0);
  });

  it('rounds up to whole units with roundTo 100', () => {
    // 249900 × 0.65 = 162435 → 162500
    expect(convertAudCents(249900, usd(100))).toBe(162500);
    // 10000 × 0.65 = 6500 exactly → no rounding
    expect(convertAudCents(10000, usd(100))).toBe(6500);
    // 1 cent → still rounds up to a whole unit
    expect(convertAudCents(1, usd(100))).toBe(100);
  });

  it('rounds up to the next cent with roundTo 1', () => {
    // 249900 × 0.65 = 162435 exactly
    expect(convertAudCents(249900, usd(1))).toBe(162435);
    // 999 × 0.65 = 649.35 → 650
    expect(convertAudCents(999, usd(1))).toBe(650);
  });

  it('supports other roundTo steps', () => {
    // 10000 × 0.65 = 6500 → multiple of 500 → 6500; 10001 → 6500.65 → 7000
    expect(convertAudCents(10000, usd(500))).toBe(6500);
    expect(convertAudCents(10001, usd(500))).toBe(7000);
  });

  it('uses exact decimal maths (no float drift)', () => {
    // 0.1 + 0.2 style drift would give 30000.000000000004 → 30001 with roundTo 1
    expect(convertAudCents(100000, usd(1, '0.300000'))).toBe(30000);
    expect(convertAudCents(3, usd(1, '1.090000'))).toBe(4); // 3.27 → 4
  });

  it('rejects non-integer or negative amounts', () => {
    expect(() => convertAudCents(10.5, usd(1))).toThrow();
    expect(() => convertAudCents(-1, usd(1))).toThrow();
  });

  it('parses rates to micro-units', () => {
    expect(rateToMicros('1')).toBe(1_000_000n);
    expect(rateToMicros('0.65')).toBe(650_000n);
    expect(rateToMicros('1.090000')).toBe(1_090_000n);
    expect(() => rateToMicros('0')).toThrow();
    expect(() => rateToMicros('abc')).toThrow();
  });
});

describe('price filter bounds (inverse conversion)', () => {
  const rates = [usd(100), usd(1), usd(500), usd(100, '1.090000'), AUD_RATE];

  it.each(rates)('max bound matches exactly what the shopper sees ($code roundTo $roundTo)', (rate) => {
    for (const maxDisplay of [0, 99, 100, 6500, 6501, 10000, 162500]) {
      const maxAud = maxAudCentsFor(maxDisplay, rate);
      for (let x = Math.max(0, maxAud - 300); x <= maxAud + 300; x++) {
        expect(convertAudCents(x, rate) <= maxDisplay).toBe(x <= maxAud);
      }
    }
  });

  it.each(rates)('min bound matches exactly what the shopper sees ($code roundTo $roundTo)', (rate) => {
    for (const minDisplay of [0, 1, 100, 6500, 6501, 10000]) {
      const minAud = minAudCentsFor(minDisplay, rate);
      for (let x = Math.max(0, minAud - 300); x <= minAud + 300; x++) {
        expect(convertAudCents(x, rate) >= minDisplay).toBe(x >= minAud);
      }
    }
  });
});
