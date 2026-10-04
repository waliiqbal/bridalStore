import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ReorderDto } from '../../../common/dto/reorder.dto.js';
import { BannerQueryDto, CreateBannerDto, UpdateBannerDto } from './dto/banner.dto.js';
import { BannersService } from './banners.service.js';

@Controller('admin/banners')
export class BannersAdminController {
  constructor(private readonly banners: BannersService) {}

  @Get()
  list(@Query() query: BannerQueryDto) {
    return this.banners.listAdmin(query.placement);
  }

  @Post()
  create(@Body() dto: CreateBannerDto) {
    return this.banners.create(dto);
  }

  @Put('reorder')
  reorder(@Body() dto: ReorderDto) {
    return this.banners.reorder(dto.ids);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.banners.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.banners.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.banners.remove(id);
  }
}
