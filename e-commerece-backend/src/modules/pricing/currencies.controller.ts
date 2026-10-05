import { Controller, Get } from '@nestjs/common';
import { CurrencyService } from './currency.service.js';

@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currencies: CurrencyService) {}

  @Get()
  list() {
    return this.currencies.listEnabled();
  }
}
