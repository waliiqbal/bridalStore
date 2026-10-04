// Integer-only currency maths. Rates arrive as Decimal(12,6) strings and are
// handled as BigInt micro-units, so no float ever touches a money value.

export const BASE_CURRENCY = 'AUD';

export interface CurrencyRate {
  code: string;
  // Units of this currency per 1 AUD, as a decimal string (e.g. "0.650000")
  rateFromAud: string;
  // Round converted amounts up to a multiple of this many cents
  roundTo: number;
}

export const AUD_RATE: CurrencyRate = {
  code: BASE_CURRENCY,
  rateFromAud: '1',
  roundTo: 1,
};

const SCALE = 1_000_000n;

export function rateToMicros(rate: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(rate.trim());
  if (!match) throw new Error(`Invalid exchange rate: ${rate}`);
  const [, whole, fraction = ''] = match;
  const micros = BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, '0'));
  if (micros <= 0n) throw new Error(`Exchange rate must be positive: ${rate}`);
  return micros;
}

function assertCents(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer number of cents`);
  }
}

// a / b rounded up, for a >= 0 and b > 0
const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b;

// ceil(audCents × rate / roundTo) × roundTo. The base currency is returned unchanged.
export function convertAudCents(audCents: number, rate: CurrencyRate): number {
  assertCents(audCents, 'Amount');
  if (rate.code === BASE_CURRENCY) return audCents;
  const roundTo = BigInt(rate.roundTo);
  const scaled = BigInt(audCents) * rateToMicros(rate.rateFromAud);
  return Number(ceilDiv(scaled, SCALE * roundTo) * roundTo);
}

// Exact inverse of convertAudCents for price filters:
// convertAudCents(x) <= maxDisplay  ⇔  x <= maxAudCentsFor(maxDisplay)
export function maxAudCentsFor(maxDisplay: number, rate: CurrencyRate): number {
  assertCents(maxDisplay, 'Maximum price');
  if (rate.code === BASE_CURRENCY) return maxDisplay;
  const roundTo = BigInt(rate.roundTo);
  const steps = BigInt(maxDisplay) / roundTo;
  return Number((steps * roundTo * SCALE) / rateToMicros(rate.rateFromAud));
}

// convertAudCents(x) >= minDisplay  ⇔  x >= minAudCentsFor(minDisplay)
export function minAudCentsFor(minDisplay: number, rate: CurrencyRate): number {
  assertCents(minDisplay, 'Minimum price');
  if (rate.code === BASE_CURRENCY) return minDisplay;
  const roundTo = BigInt(rate.roundTo);
  const steps = ceilDiv(BigInt(minDisplay), roundTo);
  if (steps === 0n) return 0;
  return Number(((steps - 1n) * roundTo * SCALE) / rateToMicros(rate.rateFromAud) + 1n);
}
