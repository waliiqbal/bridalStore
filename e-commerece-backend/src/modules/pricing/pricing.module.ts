import { Module } from '@nestjs/common';
import { CouponsAdminController } from './coupons.admin.controller.js';
import { CouponsAdminService } from './coupons.admin.service.js';
import { CurrenciesAdminController } from './currencies.admin.controller.js';
import { CurrenciesAdminService } from './currencies.admin.service.js';
import { CurrenciesController } from './currencies.controller.js';
import { CurrencyService } from './currency.service.js';
import { PricingService } from './pricing.service.js';

@Module({
  controllers: [CurrenciesController, CurrenciesAdminController, CouponsAdminController],
  providers: [CurrencyService, PricingService, CurrenciesAdminService, CouponsAdminService],
  exports: [CurrencyService, PricingService],
})
export class PricingModule {}
