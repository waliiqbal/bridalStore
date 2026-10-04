import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  Cookie,
  CurrentCustomer,
  CustomerAuth,
  type CustomerProfile,
} from '../auth/customer/customer-session.js';
import { CART_COOKIE } from '../cart/cart.controller.js';
import { OrderNumberDto, PayPalCaptureDto, SquarePaymentDto } from './dto/payments.dto.js';
import { PaymentsService, type Payer } from './payments.service.js';

const MINUTE = 60_000;

/**
 * Shopper payment steps. Only the browser that placed the order (cart
 * cookie) or the signed-in customer who owns it can pay it. Amounts always
 * come from the order in the database.
 */
@Controller('payments')
@CustomerAuth('optional')
@UseGuards(ThrottlerGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  // Public keys only (Stripe publishable key, Square app/location ID, PayPal client ID)
  @Get('config')
  @Throttle({ default: { limit: 120, ttl: MINUTE } })
  config() {
    return this.payments.publicConfig();
  }

  // → { clientSecret } for Stripe's Payment Element (cards, Apple Pay, Google Pay)
  @Post('stripe/intent')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: MINUTE } })
  stripeIntent(
    @Body() dto: OrderNumberDto,
    @Cookie(CART_COOKIE) cartToken: string | undefined,
    @CurrentCustomer() customer: CustomerProfile | undefined,
  ) {
    return this.payments.startStripe(dto.orderNumber, payer(cartToken, customer));
  }

  // Charges a card tokenized by Square's Web Payments SDK. 402 if declined.
  @Post('square')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  square(
    @Body() dto: SquarePaymentDto,
    @Cookie(CART_COOKIE) cartToken: string | undefined,
    @CurrentCustomer() customer: CustomerProfile | undefined,
  ) {
    return this.payments.paySquare(dto.orderNumber, dto.sourceId, dto.verificationToken, payer(cartToken, customer));
  }

  // → { paypalOrderId } for the PayPal buttons
  @Post('paypal/order')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: MINUTE } })
  paypalOrder(
    @Body() dto: OrderNumberDto,
    @Cookie(CART_COOKIE) cartToken: string | undefined,
    @CurrentCustomer() customer: CustomerProfile | undefined,
  ) {
    return this.payments.startPayPal(dto.orderNumber, payer(cartToken, customer));
  }

  // After the shopper approves in PayPal; captured on the server. 402 if declined.
  @Post('paypal/capture')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: MINUTE } })
  paypalCapture(
    @Body() dto: PayPalCaptureDto,
    @Cookie(CART_COOKIE) cartToken: string | undefined,
    @CurrentCustomer() customer: CustomerProfile | undefined,
  ) {
    return this.payments.capturePayPal(dto.orderNumber, dto.paypalOrderId, payer(cartToken, customer));
  }

  // When the shopper returns: checks with the provider, never trusts the browser.
  @Post(':orderNumber/confirm')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: MINUTE } })
  confirm(
    @Param('orderNumber') orderNumber: string,
    @Cookie(CART_COOKIE) cartToken: string | undefined,
    @CurrentCustomer() customer: CustomerProfile | undefined,
  ) {
    return this.payments.confirm(orderNumber, payer(cartToken, customer));
  }
}

function payer(cartToken: string | undefined, customer: CustomerProfile | undefined): Payer {
  return { cartToken, customerId: customer?.id };
}
