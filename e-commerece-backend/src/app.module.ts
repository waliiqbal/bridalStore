import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CsrfGuard } from './common/csrf/csrf.guard.js';
import { validateEnv } from './config/env.validation.js';
import { HealthController } from './health/health.controller.js';
import { AccountModule } from './modules/account/account.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CartModule } from './modules/cart/cart.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { CollectionsModule } from './modules/collections/collections.module.js';
import { ContentModule } from './modules/content/content.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { MailModule } from './modules/mail/mail.module.js';
import { PricingModule } from './modules/pricing/pricing.module.js';
import { RedirectsModule } from './modules/redirects/redirects.module.js';
import { RevalidationModule } from './modules/revalidation/revalidation.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    // Only routes with ThrottlerGuard are limited (login, register, password reset)
    ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }] }),
    RevalidationModule,
    MailModule,
    AuthModule,
    PricingModule,
    CatalogModule,
    CollectionsModule,
    RedirectsModule,
    UploadsModule,
    ContentModule,
    CartModule,
    AccountModule,
    CustomersModule,
  ],
  controllers: [AppController, HealthController],
  // CSRF check for every state-changing request (X-Requested-With header)
  providers: [AppService, { provide: APP_GUARD, useClass: CsrfGuard }],
})
export class AppModule {}
