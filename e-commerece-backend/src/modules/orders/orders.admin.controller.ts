import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import type { AdminProfile } from '../auth/auth.types.js';
import { CurrentAdmin } from '../auth/decorators.js';
import { AdminOrderListQueryDto, ChangeOrderStatusDto, UpdateOrderDto } from './dto/orders.dto.js';
import { OrderLifecycleService } from './order-lifecycle.service.js';
import { OrdersService } from './orders.service.js';

@Controller('admin/orders')
export class OrdersAdminController {
  constructor(
    private readonly orders: OrdersService,
    private readonly lifecycle: OrderLifecycleService,
  ) {}

  // Newest first; filter by status, date range, or search order number / email / name
  @Get()
  list(@Query() query: AdminOrderListQueryDto) {
    return this.orders.adminList(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.orders.adminGet(id);
  }

  // One-click status buttons. SHIPPED needs trackingNumber.
  @Post(':id/status')
  @HttpCode(200)
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeOrderStatusDto,
    @CurrentAdmin() admin: AdminProfile,
  ) {
    const { refundRequired } = await this.lifecycle.changeStatus(id, dto.status, admin.email, dto);
    return { refundRequired, order: await this.orders.adminGet(id) };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.orders.updateAdminNote(id, dto.adminNote, dto.resolveAttention);
  }
}
