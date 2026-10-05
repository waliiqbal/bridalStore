import { BadRequestException } from '@nestjs/common';
import { parsePaymentsEnv } from '../../config/payments-env.js';
import {
  allowedProviders,
  assertProviderAllowed,
  assertTwoDecimalCurrency,
  centsToDecimal,
  decimalToCents,
  refundableAmount,
} from './payment-rules.js';

describe('payment routing', () => {
  const all = ['SQUARE', 'STRIPE', 'PAYPAL'] as const;

  it('AUD → Square or PayPal; other currencies → Stripe or PayPal', () => {
    expect(allowedProviders('AUD', [...all])).toEqual(['SQUARE', 'PAYPAL']);
    expect(allowedProviders('USD', [...all])).toEqual(['STRIPE', 'PAYPAL']);
    expect(allowedProviders('GBP', [...all])).toEqual(['STRIPE', 'PAYPAL']);
  });

  it('only offers providers that are configured', () => {
    expect(allowedProviders('AUD', ['PAYPAL'])).toEqual(['PAYPAL']);
    expect(allowedProviders('USD', ['SQUARE'])).toEqual([]);
  });

  it('rejects a provider not allowed for the currency', () => {
    expect(() => assertProviderAllowed('STRIPE', 'AUD', [...all])).toThrow(BadRequestException);
    expect(() => assertProviderAllowed('SQUARE', 'USD', [...all])).toThrow(/isn't available for USD/);
    expect(() => assertProviderAllowed('PAYPAL', 'AUD', ['SQUARE'])).toThrow(BadRequestException);
    expect(() => assertProviderAllowed('SQUARE', 'AUD', [...all])).not.toThrow();
  });
});

describe('amounts', () => {
  it('only allows 2-decimal currencies', () => {
    for (const code of ['AUD', 'USD', 'GBP', 'CAD', 'NZD']) expect(() => assertTwoDecimalCurrency(code)).not.toThrow();
    expect(() => assertTwoDecimalCurrency('JPY')).toThrow(/2 decimal places/); // 0 decimals
    expect(() => assertTwoDecimalCurrency('KWD')).toThrow(/2 decimal places/); // 3 decimals
    expect(() => assertTwoDecimalCurrency('XXX1')).toThrow();
  });

  it('converts cents ↔ decimal strings exactly', () => {
    expect(centsToDecimal(8100)).toBe('81.00');
    expect(centsToDecimal(5)).toBe('0.05');
    expect(decimalToCents('81.00')).toBe(8100);
    expect(decimalToCents('81.5')).toBe(8150);
    expect(decimalToCents('0.07')).toBe(7);
    expect(() => decimalToCents('81.005')).toThrow();
    expect(() => centsToDecimal(1.5)).toThrow();
  });

  it('never refunds more than was paid minus earlier refunds (failed ones do not count)', () => {
    expect(refundableAmount(10000, [])).toBe(10000);
    expect(refundableAmount(10000, [{ amount: 3000, status: 'SUCCEEDED' }, { amount: 2000, status: 'PENDING' }])).toBe(5000);
    expect(refundableAmount(10000, [{ amount: 3000, status: 'FAILED' }])).toBe(10000);
    expect(refundableAmount(10000, [{ amount: 10000, status: 'SUCCEEDED' }, { amount: 1, status: 'PENDING' }])).toBe(0);
  });
});

describe('payments env', () => {
  const read = (values: Record<string, string>) => (key: string) => values[key] ?? '';
  const stripeTest = { STRIPE_SECRET_KEY: 'sk_test_abc', STRIPE_PUBLISHABLE_KEY: 'pk_test_abc', STRIPE_WEBHOOK_SECRET: 'whsec_abc' };
  const stripeLive = { STRIPE_SECRET_KEY: 'sk_live_abc', STRIPE_PUBLISHABLE_KEY: 'pk_live_abc', STRIPE_WEBHOOK_SECRET: 'whsec_abc' };

  it('providers without keys are simply unavailable', () => {
    const errors: string[] = [];
    expect(parsePaymentsEnv(read({}), 'development', errors)).toEqual({ driver: 'live' });
    expect(errors).toEqual([]);
  });

  it('refuses live keys outside production and test keys in production', () => {
    let errors: string[] = [];
    parsePaymentsEnv(read(stripeLive), 'development', errors);
    expect(errors).toEqual(['Stripe: live/production keys are only allowed with NODE_ENV=production']);
    errors = [];
    parsePaymentsEnv(read(stripeTest), 'production', errors);
    expect(errors).toEqual(['Stripe: NODE_ENV=production needs live/production keys, not sandbox/test keys']);
    errors = [];
    parsePaymentsEnv(read({ PAYPAL_CLIENT_ID: 'a', PAYPAL_CLIENT_SECRET: 'b', PAYPAL_WEBHOOK_ID: 'c', PAYPAL_ENVIRONMENT: 'production' }), 'test', errors);
    expect(errors[0]).toMatch(/PayPal: live\/production keys/);
  });

  it('names what is missing for a half-configured provider', () => {
    const errors: string[] = [];
    parsePaymentsEnv(read({ SQUARE_ACCESS_TOKEN: 'x' }), 'development', errors);
    expect(errors[0]).toMatch(/Square is partly configured.*SQUARE_APPLICATION_ID/);
  });

  it('catches mismatched Stripe keys and a fake driver in production', () => {
    const errors: string[] = [];
    parsePaymentsEnv(read({ ...stripeTest, STRIPE_PUBLISHABLE_KEY: 'pk_live_x', PAYMENTS_DRIVER: 'fake' }), 'production', errors);
    expect(errors).toEqual(
      expect.arrayContaining([
        'PAYMENTS_DRIVER=fake is for tests only and cannot run with NODE_ENV=production',
        'STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY must both be test keys or both be live keys',
      ]),
    );
  });

  it('checks Square sandbox application IDs', () => {
    const errors: string[] = [];
    parsePaymentsEnv(
      read({
        SQUARE_ACCESS_TOKEN: 't',
        SQUARE_APPLICATION_ID: 'sq0idp-live',
        SQUARE_LOCATION_ID: 'L1',
        SQUARE_WEBHOOK_SIGNATURE_KEY: 'k',
        SQUARE_WEBHOOK_URL: 'https://api.example.com/api/webhooks/square',
      }),
      'development',
      errors,
    );
    expect(errors).toEqual(['SQUARE_APPLICATION_ID does not look like a sandbox application ID']);
  });
});
