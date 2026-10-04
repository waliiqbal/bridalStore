import { BadRequestException } from '@nestjs/common';
import type { PaymentProvider } from '../../generated/prisma/enums.js';

// AUD → Square (linked to the shop) or PayPal; other currencies → Stripe or PayPal.
export function providersForCurrency(currencyCode: string): PaymentProvider[] {
  return currencyCode === 'AUD' ? ['SQUARE', 'PAYPAL'] : ['STRIPE', 'PAYPAL'];
}

// Allowed for this currency AND configured on this server.
export function allowedProviders(currencyCode: string, available: PaymentProvider[]): PaymentProvider[] {
  return providersForCurrency(currencyCode).filter((p) => available.includes(p));
}

const NAMES: Record<PaymentProvider, string> = { SQUARE: 'Card', STRIPE: 'Card', PAYPAL: 'PayPal' };

export function assertProviderAllowed(provider: PaymentProvider, currencyCode: string, available: PaymentProvider[]) {
  if (!allowedProviders(currencyCode, available).includes(provider)) {
    throw new BadRequestException(
      `${NAMES[provider]} payment (${provider}) isn't available for ${currencyCode} orders. Please choose another payment method.`,
    );
  }
}

// We send integer cents. Only currencies with exactly 2 decimals are safe for that.
export function assertTwoDecimalCurrency(currencyCode: string) {
  let digits: number | undefined;
  try {
    digits = new Intl.NumberFormat('en', { style: 'currency', currency: currencyCode }).resolvedOptions()
      .maximumFractionDigits;
  } catch {
    digits = undefined;
  }
  if (digits !== 2) {
    throw new BadRequestException(`${currencyCode} can't be used for payments (amounts must have 2 decimal places)`);
  }
}

// 8100 → "81.00" (PayPal sends amounts as decimal strings)
export function centsToDecimal(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error(`Invalid amount: ${cents}`);
  const units = Math.floor(cents / 100);
  return `${units}.${String(cents % 100).padStart(2, '0')}`;
}

// "81.5" → 8150, "81.00" → 8100. Exact; never goes through floats.
export function decimalToCents(value: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error(`Invalid amount: ${value}`);
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}

// "A$81.00" style text for notes in the order history (not for shop display)
export function moneyText(cents: number, currencyCode: string): string {
  return `${currencyCode} ${centsToDecimal(cents)}`;
}

/** What can still be refunded from a payment: paid minus pending/succeeded refunds. */
export function refundableAmount(paid: number, refunds: { amount: number; status: string }[]): number {
  const taken = refunds.filter((r) => r.status !== 'FAILED').reduce((sum, r) => sum + r.amount, 0);
  return Math.max(0, paid - taken);
}
