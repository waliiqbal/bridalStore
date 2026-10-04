import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { CollectionsAdminController } from './collections.admin.controller.js';
import { CollectionsAdminService } from './collections.admin.service.js';
import { CollectionsController } from './collections.controller.js';
import { CollectionsService } from './collections.service.js';

@Module({
  imports: [CatalogModule, PricingModule],
  controllers: [CollectionsController, CollectionsAdminController],
  providers: [CollectionsService, CollectionsAdminService],
})
export class CollectionsModule {}
