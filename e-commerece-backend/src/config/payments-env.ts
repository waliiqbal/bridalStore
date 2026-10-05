// Payment provider settings from the environment. Each provider is either
// fully configured, or not configured at all (then it's simply unavailable).
// Live keys only run with NODE_ENV=production; test/sandbox keys never do.

export type PaymentsDriver = 'live' | 'fake';
export type ProviderEnvironment = 'sandbox' | 'production';

export interface StripeEnv {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  environment: ProviderEnvironment;
}

export interface SquareEnv {
  environment: ProviderEnvironment;
  accessToken: string;
  applicationId: string;
  locationId: string;
  webhookSignatureKey: string;
  // Exactly the notification URL registered in the Square dashboard (part of the signature)
  webhookUrl: string;
}

export interface PayPalEnv {
  environment: ProviderEnvironment;
  clientId: string;
  clientSecret: string;
  webhookId: string;
}

export interface PaymentsEnv {
  driver: PaymentsDriver;
  stripe?: StripeEnv;
  square?: SquareEnv;
  paypal?: PayPalEnv;
}

type Read = (key: string) => string;

// all → configured; none → undefined; some → error naming what is missing
function group(read: Read, keys: string[], provider: string, errors: string[]): boolean {
  const missing = keys.filter((k) => !read(k));
  if (missing.length === keys.length) return false;
  if (missing.length) {
    errors.push(`${provider} is partly configured. Also set: ${missing.join(', ')} (or remove all ${provider} keys)`);
    return false;
  }
  return true;
}

function environmentMatches(
  provider: string,
  environment: ProviderEnvironment,
  production: boolean,
  errors: string[],
) {
  if (production && environment !== 'production') {
    errors.push(`${provider}: NODE_ENV=production needs live/production keys, not sandbox/test keys`);
  }
  if (!production && environment === 'production') {
    errors.push(`${provider}: live/production keys are only allowed with NODE_ENV=production`);
  }
}

function readEnvironment(read: Read, key: string, errors: string[]): ProviderEnvironment {
  const value = (read(key) || 'sandbox').toLowerCase();
  if (value !== 'sandbox' && value !== 'production') {
    errors.push(`${key} must be sandbox or production`);
    return 'sandbox';
  }
  return value;
}

export function parsePaymentsEnv(read: Read, nodeEnv: string, errors: string[]): PaymentsEnv {
  const production = nodeEnv === 'production';
  const driver = (read('PAYMENTS_DRIVER') || 'live').toLowerCase();
  if (driver !== 'live' && driver !== 'fake') errors.push('PAYMENTS_DRIVER must be live or fake');
  if (driver === 'fake' && production) {
    errors.push('PAYMENTS_DRIVER=fake is for tests only and cannot run with NODE_ENV=production');
  }
  const result: PaymentsEnv = { driver: driver === 'fake' ? 'fake' : 'live' };

  // ── Stripe: key prefixes tell test from live ──
  if (group(read, ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'], 'Stripe', errors)) {
    const secretKey = read('STRIPE_SECRET_KEY');
    const publishableKey = read('STRIPE_PUBLISHABLE_KEY');
    const webhookSecret = read('STRIPE_WEBHOOK_SECRET');
    const secretMode = /^(sk|rk)_live_/.test(secretKey) ? 'live' : /^(sk|rk)_test_/.test(secretKey) ? 'test' : null;
    const publicMode = publishableKey.startsWith('pk_live_') ? 'live' : publishableKey.startsWith('pk_test_') ? 'test' : null;
    if (!secretMode) errors.push('STRIPE_SECRET_KEY must start with sk_test_ / sk_live_ (or rk_ for restricted keys)');
    if (!publicMode) errors.push('STRIPE_PUBLISHABLE_KEY must start with pk_test_ or pk_live_');
    if (!webhookSecret.startsWith('whsec_')) errors.push('STRIPE_WEBHOOK_SECRET must start with whsec_');
    if (secretMode && publicMode && secretMode !== publicMode) {
      errors.push('STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY must both be test keys or both be live keys');
    }
    const environment: ProviderEnvironment = secretMode === 'live' ? 'production' : 'sandbox';
    environmentMatches('Stripe', environment, production, errors);
    result.stripe = { secretKey, publishableKey, webhookSecret, environment };
  }

  // ── Square ──
  const squareKeys = ['SQUARE_ACCESS_TOKEN', 'SQUARE_APPLICATION_ID', 'SQUARE_LOCATION_ID', 'SQUARE_WEBHOOK_SIGNATURE_KEY', 'SQUARE_WEBHOOK_URL'];
  if (group(read, squareKeys, 'Square', errors)) {
    const environment = readEnvironment(read, 'SQUARE_ENVIRONMENT', errors);
    const applicationId = read('SQUARE_APPLICATION_ID');
    // Sandbox application IDs start with "sandbox-"
    if ((environment === 'sandbox') !== applicationId.startsWith('sandbox-')) {
      errors.push(`SQUARE_APPLICATION_ID does not look like a ${environment} application ID`);
    }
    if (!/^https:\/\/\S+$/.test(read('SQUARE_WEBHOOK_URL'))) {
      errors.push('SQUARE_WEBHOOK_URL must be the https:// notification URL registered with Square');
    }
    environmentMatches('Square', environment, production, errors);
    result.square = {
      environment,
      accessToken: read('SQUARE_ACCESS_TOKEN'),
      applicationId,
      locationId: read('SQUARE_LOCATION_ID'),
      webhookSignatureKey: read('SQUARE_WEBHOOK_SIGNATURE_KEY'),
      webhookUrl: read('SQUARE_WEBHOOK_URL'),
    };
  }

  // ── PayPal ──
  if (group(read, ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID'], 'PayPal', errors)) {
    const environment = readEnvironment(read, 'PAYPAL_ENVIRONMENT', errors);
    environmentMatches('PayPal', environment, production, errors);
    result.paypal = {
      environment,
      clientId: read('PAYPAL_CLIENT_ID'),
      clientSecret: read('PAYPAL_CLIENT_SECRET'),
      webhookId: read('PAYPAL_WEBHOOK_ID'),
    };
  }

  return result;
}
