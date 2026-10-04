import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateRateDto, CreateZoneDto, UpdateRateDto, UpdateZoneDto } from './dto/shipping.dto.js';
import { ShippingService } from './shipping.service.js';

@Controller('admin/shipping/zones')
export class ShippingAdminController {
  constructor(private readonly shipping: ShippingService) {}

  @Get()
  list() {
    return this.shipping.listZones();
  }

  @Post()
  create(@Body() dto: CreateZoneDto) {
    return this.shipping.createZone(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateZoneDto) {
    return this.shipping.updateZone(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shipping.removeZone(id);
  }

  @Post(':id/rates')
  createRate(@Param('id') id: string, @Body() dto: CreateRateDto) {
    return this.shipping.createRate(id, dto);
  }

  @Patch(':id/rates/:rateId')
  updateRate(@Param('id') id: string, @Param('rateId') rateId: string, @Body() dto: UpdateRateDto) {
    return this.shipping.updateRate(id, rateId, dto);
  }

  @Delete(':id/rates/:rateId')
  removeRate(@Param('id') id: string, @Param('rateId') rateId: string) {
    return this.shipping.removeRate(id, rateId);
  }
}
