import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ReorderDto } from '../../../common/dto/reorder.dto.js';
import { AttributesService } from './attributes.service.js';
import {
  CreateAttributeDto,
  CreateAttributeValueDto,
  UpdateAttributeDto,
  UpdateAttributeValueDto,
} from './dto/attribute.dto.js';

@Controller('admin/attributes')
export class AttributesAdminController {
  constructor(private readonly attributes: AttributesService) {}

  @Get()
  list() {
    return this.attributes.list();
  }

  @Put('reorder')
  reorder(@Body() dto: ReorderDto) {
    return this.attributes.reorder(dto.ids);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.attributes.get(id);
  }

  @Post()
  create(@Body() dto: CreateAttributeDto) {
    return this.attributes.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAttributeDto) {
    return this.attributes.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attributes.remove(id);
  }

  @Post(':id/values')
  createValue(@Param('id') id: string, @Body() dto: CreateAttributeValueDto) {
    return this.attributes.createValue(id, dto);
  }

  @Put(':id/values/reorder')
  reorderValues(@Param('id') id: string, @Body() dto: ReorderDto) {
    return this.attributes.reorderValues(id, dto.ids);
  }

  @Patch(':id/values/:valueId')
  updateValue(
    @Param('id') id: string,
    @Param('valueId') valueId: string,
    @Body() dto: UpdateAttributeValueDto,
  ) {
    return this.attributes.updateValue(id, valueId, dto);
  }

  @Delete(':id/values/:valueId')
  removeValue(@Param('id') id: string, @Param('valueId') valueId: string) {
    return this.attributes.removeValue(id, valueId);
  }
}
