import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { sessionCookieOptions } from '../../../common/cookies.js';
import type { Env } from '../../../config/env.validation.js';
import { CART_COOKIE } from '../../cart/cart.controller.js';
import { CART_TTL_DAYS } from '../../cart/cart-rules.js';
import { CartService } from '../../cart/cart.service.js';
import { CustomerAuthService } from './customer-auth.service.js';
import {
  Cookie,
  CUSTOMER_COOKIE,
  CurrentCustomer,
  CustomerAuth,
  type CustomerProfile,
} from './customer-session.js';
import {
  CustomerLoginDto,
  ForgotPasswordDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/customer-auth.dto.js';

const MINUTE = 60_000;

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class CustomerAuthController {
  constructor(
    private readonly auth: CustomerAuthService,
    private readonly cart: CartService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // 201 { status: "CREATED", customer } (signed in), or
  // 202 { status: "CHECK_EMAIL" } when the email belongs to a guest checkout
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: MINUTE } })
  async register(
    @Body() dto: RegisterDto,
    @Cookie(CART_COOKIE) cartToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(dto);
    if (result.status === 'CHECK_EMAIL') {
      res.status(202);
      return {
        status: result.status,
        message: 'We have sent you an email with a link to finish creating your account.',
      };
    }
    await this.startSession(res, result.token, result.customer.id, cartToken);
    return { status: result.status, customer: result.customer };
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  async login(
    @Body() dto: CustomerLoginDto,
    @Cookie(CART_COOKIE) cartToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { customer, token } = await this.auth.login(dto.email, dto.password);
    await this.startSession(res, token, customer.id, cartToken);
    return { customer };
  }

  // Also clears the cart cookie so the next person on a shared device starts empty
  @Post('logout')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: MINUTE } })
  logout(@Res({ passthrough: true }) res: Response) {
    const options = sessionCookieOptions(this.production());
    res.clearCookie(CUSTOMER_COOKIE, options);
    res.clearCookie(CART_COOKIE, options);
    return { success: true };
  }

  @Get('me')
  @CustomerAuth('required')
  @Throttle({ default: { limit: 120, ttl: MINUTE } })
  me(@CurrentCustomer() customer: CustomerProfile) {
    return { customer };
  }

  // Same response whether or not the email has an account
  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: MINUTE } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    this.auth.requestPasswordReset(dto.email);
    return {
      success: true,
      message: 'If an account exists for that email, we have sent a link to reset your password.',
    };
  }

  // Also used for the "finish creating your account" link. Signs out all sessions.
  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
    return { success: true, message: 'Your password has been updated. Please log in.' };
  }

  private async startSession(res: Response, token: string, customerId: string, guestCartToken?: string) {
    const production = this.production();
    const days = this.config.get('CUSTOMER_SESSION_DAYS', { infer: true });
    res.cookie(CUSTOMER_COOKIE, token, sessionCookieOptions(production, days));

    const cartToken = await this.cart.mergeOnLogin(guestCartToken, customerId);
    if (cartToken) res.cookie(CART_COOKIE, cartToken, sessionCookieOptions(production, CART_TTL_DAYS));
    else if (guestCartToken) res.clearCookie(CART_COOKIE, sessionCookieOptions(production));
  }

  private production() {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }
}
