import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { sessionCookieOptions } from '../../common/cookies.js';
import type { Env } from '../../config/env.validation.js';
import {
  Cookie,
  CurrentCustomer,
  CustomerAuth,
  type CustomerProfile,
} from '../auth/customer/customer-session.js';
import { CART_TTL_DAYS } from './cart-rules.js';
import { CartService, type CartContext, type CartPricingOptions, type CartResult } from './cart.service.js';
import { AddCartItemDto, ApplyCouponDto, CartQueryDto, UpdateCartItemDto } from './dto/cart.dto.js';

export const CART_COOKIE = 'cart_token';

/**
 * Works for guests (cart cookie) and signed-in customers. Every endpoint
 * accepts ?currency=&country=&shippingRateId= and returns the full priced cart.
 */
@Controller('cart')
@CustomerAuth('optional')
export class CartController {
  constructor(
    private readonly cart: CartService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get()
  async get(
    @Cookie(CART_COOKIE) token: string | undefined,
    @CurrentCustomer() customer: CustomerProfile | undefined,
    @Query() query: CartQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.send(res, await this.cart.get(ctx(token, customer), options(query)));
  }

  @Post('items')
  async add(
    @Cookie(CART_COOKIE) token: string | undefined,
    @CurrentCustomer() customer: CustomerProfile | undefined,
    @Query() query: CartQueryDto,
    @Body() dto: AddCartItemDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.send(res, await this.cart.addItem(ctx(token, customer), dto.variantId, dto.quantity, options(query)));
  }

  @Patch('items/:itemId')
  async update(
    @Cookie(CART_COOKIE) token: string | undefined,
    @CurrentCustomer() customer: CustomerProfile | undefined,
    @Param('itemId') itemId: string,
    @Query() query: CartQueryDto,
    @Body() dto: UpdateCartItemDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.send(res, await this.cart.updateItem(ctx(token, customer), itemId, dto.quantity, options(query)));
  }

  @Delete('items/:itemId')
  async remove(
    @Cookie(CART_COOKIE) token: string | undefined,
    @CurrentCustomer() customer: CustomerProfile | undefined,
    @Param('itemId') itemId: string,
    @Query() query: CartQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.send(res, await this.cart.removeItem(ctx(token, customer), itemId, options(query)));
  }

  // 400 with the reason (expired, minimum spend...) when the code can't be used
  @Post('coupon')
  @HttpCode(200)
  async applyCoupon(
    @Cookie(CART_COOKIE) token: string | undefined,
    @CurrentCustomer() customer: CustomerProfile | undefined,
    @Query() query: CartQueryDto,
    @Body() dto: ApplyCouponDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.send(res, await this.cart.applyCoupon(ctx(token, customer), dto.code, options(query)));
  }

  @Delete('coupon')
  async removeCoupon(
    @Cookie(CART_COOKIE) token: string | undefined,
    @CurrentCustomer() customer: CustomerProfile | undefined,
    @Query() query: CartQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.send(res, await this.cart.removeCoupon(ctx(token, customer), options(query)));
  }

  @Delete()
  async clear(
    @Cookie(CART_COOKIE) token: string | undefined,
    @CurrentCustomer() customer: CustomerProfile | undefined,
    @Query() query: CartQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.send(res, await this.cart.clear(ctx(token, customer), options(query)));
  }

  private send(res: Response, result: CartResult) {
    const production = this.config.get('NODE_ENV', { infer: true }) === 'production';
    if (result.cartToken) {
      res.cookie(CART_COOKIE, result.cartToken, sessionCookieOptions(production, CART_TTL_DAYS));
    } else if (result.cartToken === null) {
      res.clearCookie(CART_COOKIE, sessionCookieOptions(production));
    }
    return result.cart;
  }
}

function ctx(token: string | undefined, customer: CustomerProfile | undefined): CartContext {
  return { token, customerId: customer?.id };
}

function options(query: CartQueryDto): CartPricingOptions {
  return { currency: query.currency, country: query.country, shippingRateId: query.shippingRateId };
}
