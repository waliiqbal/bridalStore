import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ReorderDto } from '../../../common/dto/reorder.dto.js';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

@Controller('admin/categories')
export class CategoriesAdminController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  tree() {
    return this.categories.adminTree();
  }

  @Put('reorder')
  reorder(@Body() dto: ReorderDto) {
    return this.categories.reorder(dto.ids);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.categories.get(id);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categories.remove(id);
  }
}
