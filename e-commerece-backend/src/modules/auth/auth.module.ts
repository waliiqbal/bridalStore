import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import type { Env } from '../../config/env.validation.js';
import { CartModule } from '../cart/cart.module.js';
import { AdminAuthController } from './admin-auth.controller.js';
import { AdminGuard } from './admin.guard.js';
import { AuthService } from './auth.service.js';
import { CustomerAuthController } from './customer/customer-auth.controller.js';
import { CustomerAuthService } from './customer/customer-auth.service.js';
import { CustomerGuard } from './customer/customer.guard.js';
import { CUSTOMER_JWT } from './customer/customer-session.js';

const DAY_SECONDS = 24 * 60 * 60;

@Module({
  imports: [
    // Admin sessions (JWT_SECRET)
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('ADMIN_SESSION_DAYS', { infer: true }) * DAY_SECONDS,
        },
      }),
    }),
    CartModule,
  ],
  controllers: [AdminAuthController, CustomerAuthController],
  providers: [
    AuthService,
    CustomerAuthService,
    // Customer sessions use their own secret, so admin and customer tokens can never be swapped
    {
      provide: CUSTOMER_JWT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new JwtService({
          secret: config.get('CUSTOMER_JWT_SECRET', { infer: true }),
          signOptions: {
            expiresIn: config.get('CUSTOMER_SESSION_DAYS', { infer: true }) * DAY_SECONDS,
          },
        }),
    },
    { provide: APP_GUARD, useClass: AdminGuard },
    { provide: APP_GUARD, useClass: CustomerGuard },
  ],
  exports: [AuthService, CustomerAuthService],
})
export class AuthModule {}
