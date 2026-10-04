import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CouponsAdminService } from './coupons.admin.service.js';
import { CouponListQueryDto, CreateCouponDto, UpdateCouponDto } from './dto/pricing-admin.dto.js';

@Controller('admin/coupons')
export class CouponsAdminController {
  constructor(private readonly coupons: CouponsAdminService) {}

  @Get()
  list(@Query() query: CouponListQueryDto) {
    return this.coupons.list(query);
  }

  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.coupons.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.coupons.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.coupons.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coupons.remove(id);
  }
}
