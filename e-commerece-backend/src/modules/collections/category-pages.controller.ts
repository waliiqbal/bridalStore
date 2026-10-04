import { Controller, Get, Param, Query } from '@nestjs/common';
import { CategoryPagesService } from './category-pages.service.js';
import { CollectionQueryDto } from './dto/collection.dto.js';

// GET /api/categories (the tree) lives in the catalog module.
@Controller('categories')
export class CategoryPagesController {
  constructor(private readonly categoryPages: CategoryPagesService) {}

  @Get(':slug')
  get(@Param('slug') slug: string, @Query() query: CollectionQueryDto) {
    return this.categoryPages.getPublic(slug, query);
  }
}
