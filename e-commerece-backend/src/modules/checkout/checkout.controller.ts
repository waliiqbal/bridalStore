import { Body, Controller, Headers, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  Cookie,
  CurrentCustomer,
  CustomerAuth,
  type CustomerProfile,
} from '../auth/customer/customer-session.js';
import { CART_COOKIE } from '../cart/cart.controller.js';
import { CheckoutService } from './checkout.service.js';
import { CheckoutDto } from './dto/checkout.dto.js';

@Controller('checkout')
@CustomerAuth('optional')
@UseGuards(ThrottlerGuard)
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  // Final totals, shipping options and problems. Creates nothing.
  @Post('preview')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  preview(
    @Cookie(CART_COOKIE) token: string | undefined,
    @CurrentCustomer() customer: CustomerProfile | undefined,
    @Body() dto: CheckoutDto,
  ) {
    return this.checkout.preview({ token, customerId: customer?.id }, dto, customer);
  }

  /**
   * 201 { order, paymentMethods } — order is PENDING_PAYMENT, stock held 30 min.
   * 200 with the same body when the Idempotency-Key was already used.
   * 409 { problems } when something needs the shopper's attention.
   */
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(
    @Cookie(CART_COOKIE) token: string | undefined,
    @CurrentCustomer() customer: CustomerProfile | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CheckoutDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.checkout.checkout({ token, customerId: customer?.id }, dto, idempotencyKey, customer);
    res.status(result.created ? 201 : 200);
    return result.body;
  }
}
