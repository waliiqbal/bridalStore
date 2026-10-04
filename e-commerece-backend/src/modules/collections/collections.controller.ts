import { Controller, Get, Param, Query } from '@nestjs/common';
import { CollectionsService } from './collections.service.js';
import { CollectionQueryDto } from './dto/collection.dto.js';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Get(':slug')
  get(@Param('slug') slug: string, @Query() query: CollectionQueryDto) {
    return this.collections.getPublic(slug, query);
  }
}
