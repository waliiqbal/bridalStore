import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { RedirectsModule } from '../redirects/redirects.module.js';
import { CategoryPagesController } from './category-pages.controller.js';
import { CategoryPagesService } from './category-pages.service.js';
import { CollectionsAdminController } from './collections.admin.controller.js';
import { CollectionsAdminService } from './collections.admin.service.js';
import { CollectionsController } from './collections.controller.js';
import { CollectionsService } from './collections.service.js';
import { ListingService } from './listing.service.js';

@Module({
  imports: [CatalogModule, PricingModule, RedirectsModule],
  controllers: [CollectionsController, CollectionsAdminController, CategoryPagesController],
  providers: [CollectionsService, CollectionsAdminService, ListingService, CategoryPagesService],
})
export class CollectionsModule {}
