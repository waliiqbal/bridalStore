import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { Env } from '../../config/env.validation.js';
import { AdminAuthController } from './admin-auth.controller.js';
import { AdminGuard } from './admin.guard.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn:
            config.get('ADMIN_SESSION_DAYS', { infer: true }) * 24 * 60 * 60,
        },
      }),
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AdminGuard }],
  exports: [AuthService],
})
export class AuthModule {}
