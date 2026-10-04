import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrencyQueryDto } from '../../pricing/dto/currency-query.dto.js';
import { SearchQueryDto } from './dto/product.dto.js';
import { ProductsService } from './products.service.js';

@Controller()
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get('products/:slug')
  get(@Param('slug') slug: string, @Query() query: CurrencyQueryDto) {
    return this.products.getBySlug(slug, query.currency);
  }

  @Get('search')
  search(@Query() query: SearchQueryDto) {
    return this.products.search(query.q, query, query.currency);
  }
}
