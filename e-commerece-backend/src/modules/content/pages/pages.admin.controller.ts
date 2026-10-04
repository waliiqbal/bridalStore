import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ReorderDto } from '../../../common/dto/reorder.dto.js';
import {
  CreatePageDto,
  CreateSectionDto,
  UpdatePageDto,
  UpdateSectionDto,
} from './dto/page.dto.js';
import { PagesAdminService } from './pages.admin.service.js';

@Controller('admin/pages')
export class PagesAdminController {
  constructor(private readonly pages: PagesAdminService) {}

  @Get()
  list() {
    return this.pages.list();
  }

  @Post()
  create(@Body() dto: CreatePageDto) {
    return this.pages.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.pages.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    return this.pages.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pages.remove(id);
  }

  @Post(':id/sections')
  addSection(@Param('id') id: string, @Body() dto: CreateSectionDto) {
    return this.pages.addSection(id, dto);
  }

  @Put(':id/sections/reorder')
  reorderSections(@Param('id') id: string, @Body() dto: ReorderDto) {
    return this.pages.reorderSections(id, dto.ids);
  }

  // Also used to activate/deactivate: { "isActive": false }
  @Patch(':id/sections/:sectionId')
  updateSection(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.pages.updateSection(id, sectionId, dto);
  }

  @Delete(':id/sections/:sectionId')
  removeSection(@Param('id') id: string, @Param('sectionId') sectionId: string) {
    return this.pages.removeSection(id, sectionId);
  }
}
