import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { RedirectsModule } from '../redirects/redirects.module.js';
import { BannersAdminController } from './banners/banners.admin.controller.js';
import { BannersController } from './banners/banners.controller.js';
import { BannersService } from './banners/banners.service.js';
import { FaqsAdminController } from './faqs/faqs.admin.controller.js';
import { FaqsController } from './faqs/faqs.controller.js';
import { FaqsService } from './faqs/faqs.service.js';
import { MenusAdminController } from './menus/menus.admin.controller.js';
import { MenusController } from './menus/menus.controller.js';
import { MenusService } from './menus/menus.service.js';
import { PagesAdminController } from './pages/pages.admin.controller.js';
import { PagesAdminService } from './pages/pages.admin.service.js';
import { PagesController } from './pages/pages.controller.js';
import { PagesService } from './pages/pages.service.js';
import { SettingsAdminController } from './settings/settings.admin.controller.js';
import { SettingsController } from './settings/settings.controller.js';
import { SettingsService } from './settings/settings.service.js';

@Module({
  imports: [CatalogModule, PricingModule, RedirectsModule],
  controllers: [
    PagesController,
    PagesAdminController,
    MenusController,
    MenusAdminController,
    BannersController,
    BannersAdminController,
    FaqsController,
    FaqsAdminController,
    SettingsController,
    SettingsAdminController,
  ],
  providers: [
    PagesService,
    PagesAdminService,
    MenusService,
    BannersService,
    FaqsService,
    SettingsService,
  ],
})
export class ContentModule {}
