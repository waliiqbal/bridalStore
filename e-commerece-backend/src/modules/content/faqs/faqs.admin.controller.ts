import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ReorderDto } from '../../../common/dto/reorder.dto.js';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto.js';
import { FaqsService } from './faqs.service.js';

@Controller('admin/faqs')
export class FaqsAdminController {
  constructor(private readonly faqs: FaqsService) {}

  @Get()
  list() {
    return this.faqs.listAdmin();
  }

  @Post()
  create(@Body() dto: CreateFaqDto) {
    return this.faqs.create(dto);
  }

  @Put('reorder')
  reorder(@Body() dto: ReorderDto) {
    return this.faqs.reorder(dto.ids);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    return this.faqs.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.faqs.remove(id);
  }
}
