import { Body, Controller, Get, HttpCode, Patch, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { sessionCookieOptions } from '../../common/cookies.js';
import type { Env } from '../../config/env.validation.js';
import { CustomerAuthService } from '../auth/customer/customer-auth.service.js';
import {
  CUSTOMER_COOKIE,
  CurrentCustomer,
  type CustomerProfile,
} from '../auth/customer/customer-session.js';
import { ChangePasswordDto } from '../auth/customer/dto/customer-auth.dto.js';
import { UpdateProfileDto } from './dto/account.dto.js';
import { ProfileService } from './profile.service.js';

// /api/account/* requires a signed-in customer (CustomerGuard).
@Controller('account')
export class AccountController {
  constructor(
    private readonly profiles: ProfileService,
    private readonly auth: CustomerAuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get('profile')
  profile(@CurrentCustomer() customer: CustomerProfile) {
    return { customer };
  }

  @Patch('profile')
  async updateProfile(@CurrentCustomer() customer: CustomerProfile, @Body() dto: UpdateProfileDto) {
    return { customer: await this.profiles.update(customer.id, dto) };
  }

  // Keeps this device signed in; every other session is signed out.
  @Post('password')
  @HttpCode(200)
  async changePassword(
    @CurrentCustomer() customer: CustomerProfile,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = await this.auth.changePassword(customer.id, dto.currentPassword, dto.newPassword);
    const production = this.config.get('NODE_ENV', { infer: true }) === 'production';
    res.cookie(
      CUSTOMER_COOKIE,
      token,
      sessionCookieOptions(production, this.config.get('CUSTOMER_SESSION_DAYS', { infer: true })),
    );
    return { success: true, message: 'Your password has been changed.' };
  }
}
