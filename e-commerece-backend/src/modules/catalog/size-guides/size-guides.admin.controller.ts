import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateSizeGuideDto, UpdateSizeGuideDto } from './dto/size-guide.dto.js';
import { SizeGuidesService } from './size-guides.service.js';

@Controller('admin/size-guides')
export class SizeGuidesAdminController {
  constructor(private readonly guides: SizeGuidesService) {}

  @Get()
  list() {
    return this.guides.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.guides.get(id);
  }

  @Post()
  create(@Body() dto: CreateSizeGuideDto) {
    return this.guides.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSizeGuideDto) {
    return this.guides.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.guides.remove(id);
  }
}
