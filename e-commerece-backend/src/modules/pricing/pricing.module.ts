import { Module } from '@nestjs/common';
import { CurrenciesController } from './currencies.controller.js';
import { CurrencyService } from './currency.service.js';

@Module({
  controllers: [CurrenciesController],
  providers: [CurrencyService],
  exports: [CurrencyService],
})
export class PricingModule {}
