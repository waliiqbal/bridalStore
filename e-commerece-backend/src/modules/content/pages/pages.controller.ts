import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrencyQueryDto } from '../../pricing/dto/currency-query.dto.js';
import { PagesService } from './pages.service.js';

@Controller('pages')
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  // The homepage is GET /api/pages/home
  @Get(':slug')
  get(@Param('slug') slug: string, @Query() query: CurrencyQueryDto) {
    return this.pages.getBySlug(slug, query.currency);
  }
}
