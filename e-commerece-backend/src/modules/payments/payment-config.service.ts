import { Global, Injectable, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation.js';
import type { PaymentsEnv } from '../../config/payments-env.js';
import type { PaymentProvider } from '../../generated/prisma/enums.js';
import { allowedProviders } from './payment-rules.js';

/**
 * Which providers this server can use, and the PUBLIC settings the browser
 * needs. No secret ever leaves through here. Global so checkout and order
 * views can list only the methods that actually work.
 */
@Injectable()
export class PaymentConfigService {
  readonly env: PaymentsEnv;

  constructor(config: ConfigService<Env, true>) {
    this.env = config.get('PAYMENTS', { infer: true });
  }

  get isFake(): boolean {
    return this.env.driver === 'fake';
  }

  available(): PaymentProvider[] {
    if (this.isFake) return ['SQUARE', 'STRIPE', 'PAYPAL'];
    const list: PaymentProvider[] = [];
    if (this.env.square) list.push('SQUARE');
    if (this.env.stripe) list.push('STRIPE');
    if (this.env.paypal) list.push('PAYPAL');
    return list;
  }

  methodsFor(currencyCode: string): PaymentProvider[] {
    return allowedProviders(currencyCode, this.available());
  }

  publicConfig() {
    const { stripe, square, paypal } = this.env;
    if (this.isFake) {
      return {
        driver: 'fake' as const,
        stripe: { publishableKey: 'pk_test_fake', environment: 'sandbox' as const },
        square: { applicationId: 'sandbox-fake', locationId: 'FAKE', environment: 'sandbox' as const },
        paypal: { clientId: 'fake', environment: 'sandbox' as const },
      };
    }
    return {
      driver: 'live' as const,
      stripe: stripe ? { publishableKey: stripe.publishableKey, environment: stripe.environment } : null,
      square: square
        ? { applicationId: square.applicationId, locationId: square.locationId, environment: square.environment }
        : null,
      paypal: paypal ? { clientId: paypal.clientId, environment: paypal.environment } : null,
    };
  }
}

@Global()
@Module({ providers: [PaymentConfigService], exports: [PaymentConfigService] })
export class PaymentConfigModule {}
