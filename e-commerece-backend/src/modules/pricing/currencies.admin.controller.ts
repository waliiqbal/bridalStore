import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrenciesAdminService } from './currencies.admin.service.js';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto/pricing-admin.dto.js';

@Controller('admin/currencies')
export class CurrenciesAdminController {
  constructor(private readonly currencies: CurrenciesAdminService) {}

  @Get()
  list() {
    return this.currencies.list();
  }

  @Post()
  create(@Body() dto: CreateCurrencyDto) {
    return this.currencies.create(dto);
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() dto: UpdateCurrencyDto) {
    return this.currencies.update(code, dto);
  }

  @Delete(':code')
  remove(@Param('code') code: string) {
    return this.currencies.remove(code);
  }
}
