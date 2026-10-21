import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { sessionCookieOptions } from '../../common/cookies.js';
import type { Env } from '../../config/env.validation.js';
import { AuthService } from './auth.service.js';
import { ADMIN_COOKIE, type AdminProfile } from './auth.types.js';
import { CurrentAdmin, Public } from './decorators.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ admin: AdminProfile }> {
    const { token, admin } = await this.auth.login(dto.email, dto.password);
    const days = this.config.get('ADMIN_SESSION_DAYS', { infer: true });
    res.cookie(ADMIN_COOKIE, token, sessionCookieOptions(this.production(), days));
    return { admin };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response): { success: true } {
    res.clearCookie(ADMIN_COOKIE, sessionCookieOptions(this.production()));
    return { success: true };
  }

  @Get('me')
  me(@CurrentAdmin() admin: AdminProfile): { admin: AdminProfile } {
    return { admin };
  }

  private production(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }
}
