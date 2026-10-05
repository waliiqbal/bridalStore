import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module.js';
import { RedirectsModule } from '../redirects/redirects.module.js';
import { AttributesAdminController } from './attributes/attributes.admin.controller.js';
import { AttributesService } from './attributes/attributes.service.js';
import { CategoriesAdminController } from './categories/categories.admin.controller.js';
import { CategoriesController } from './categories/categories.controller.js';
import { CategoriesService } from './categories/categories.service.js';
import { ProductsAdminController } from './products/products.admin.controller.js';
import { ProductsAdminService } from './products/products.admin.service.js';
import { ProductsController } from './products/products.controller.js';
import { ProductsService } from './products/products.service.js';
import { VariantsService } from './products/variants.service.js';
import { SizeGuidesAdminController } from './size-guides/size-guides.admin.controller.js';
import { SizeGuidesService } from './size-guides/size-guides.service.js';

@Module({
  imports: [PricingModule, RedirectsModule],
  controllers: [
    CategoriesController,
    CategoriesAdminController,
    AttributesAdminController,
    SizeGuidesAdminController,
    ProductsController,
    ProductsAdminController,
  ],
  providers: [
    CategoriesService,
    AttributesService,
    SizeGuidesService,
    ProductsService,
    ProductsAdminService,
    VariantsService,
  ],
  exports: [CategoriesService],
})
export class CatalogModule {}
