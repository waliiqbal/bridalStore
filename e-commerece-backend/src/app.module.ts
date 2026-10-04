import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { validateEnv } from './config/env.validation.js';
import { HealthController } from './health/health.controller.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { CollectionsModule } from './modules/collections/collections.module.js';
import { ContentModule } from './modules/content/content.module.js';
import { PricingModule } from './modules/pricing/pricing.module.js';
import { RedirectsModule } from './modules/redirects/redirects.module.js';
import { RevalidationModule } from './modules/revalidation/revalidation.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    RevalidationModule,
    AuthModule,
    PricingModule,
    CatalogModule,
    CollectionsModule,
    RedirectsModule,
    UploadsModule,
    ContentModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
