import type { Provider } from '@nestjs/common';
import { PaymentConfigService } from '../payment-config.service.js';
import { FakeAdapter } from './fake.adapter.js';
import { PayPalAdapter } from './paypal.adapter.js';
import { PAYMENT_ADAPTERS, type PaymentAdapters } from './provider.js';
import { SquareAdapter } from './square.adapter.js';
import { StripeAdapter } from './stripe.adapter.js';

// One adapter per configured provider. Unconfigured providers are absent.
export const paymentAdaptersProvider: Provider = {
  provide: PAYMENT_ADAPTERS,
  inject: [PaymentConfigService],
  useFactory: (config: PaymentConfigService): PaymentAdapters => {
    if (config.isFake) {
      return { SQUARE: new FakeAdapter('SQUARE'), STRIPE: new FakeAdapter('STRIPE'), PAYPAL: new FakeAdapter('PAYPAL') };
    }
    const { stripe, square, paypal } = config.env;
    return {
      ...(square && { SQUARE: new SquareAdapter(square) }),
      ...(stripe && { STRIPE: new StripeAdapter(stripe) }),
      ...(paypal && { PAYPAL: new PayPalAdapter(paypal) }),
    };
  },
};
