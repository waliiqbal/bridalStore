import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/pagination/pagination.js';
import { CollectionsAdminService } from './collections.admin.service.js';
import {
  CollectionProductIdsDto,
  CreateCollectionDto,
  PreviewRulesDto,
  UpdateCollectionDto,
} from './dto/collection.dto.js';

@Controller('admin/collections')
export class CollectionsAdminController {
  constructor(private readonly collections: CollectionsAdminService) {}

  @Get()
  list() {
    return this.collections.list();
  }

  @Post()
  create(@Body() dto: CreateCollectionDto) {
    return this.collections.create(dto);
  }

  // Preview unsaved smart rules
  @Post('preview')
  previewRules(@Body() dto: PreviewRulesDto) {
    return this.collections.previewRules(dto, dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.collections.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCollectionDto) {
    return this.collections.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.collections.remove(id);
  }

  @Get(':id/preview')
  preview(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.collections.preview(id, query);
  }

  @Post(':id/products')
  addProducts(@Param('id') id: string, @Body() dto: CollectionProductIdsDto) {
    return this.collections.addProducts(id, dto.productIds);
  }

  @Put(':id/products/reorder')
  reorderProducts(@Param('id') id: string, @Body() dto: CollectionProductIdsDto) {
    return this.collections.reorderProducts(id, dto.productIds);
  }

  @Delete(':id/products/:productId')
  removeProduct(@Param('id') id: string, @Param('productId') productId: string) {
    return this.collections.removeProduct(id, productId);
  }
}
