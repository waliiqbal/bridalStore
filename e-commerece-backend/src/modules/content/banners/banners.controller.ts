import { Controller, Get, Query } from '@nestjs/common';
import { BannerQueryDto } from './dto/banner.dto.js';
import { BannersService } from './banners.service.js';

@Controller('banners')
export class BannersController {
  constructor(private readonly banners: BannersService) {}

  // Only active banners inside their start/end dates
  @Get()
  list(@Query() query: BannerQueryDto) {
    return this.banners.listPublic(query.placement);
  }
}
