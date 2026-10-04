import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import type { AdminProfile } from '../auth/auth.types.js';
import { CurrentAdmin } from '../auth/decorators.js';
import { OrderLifecycleService } from '../orders/order-lifecycle.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { CancelAndRefundDto, RefundDto } from './dto/payments.dto.js';
import { RefundsService } from './refunds.service.js';

@Controller('admin/orders')
export class PaymentsAdminController {
  constructor(
    private readonly refunds: RefundsService,
    private readonly lifecycle: OrderLifecycleService,
    private readonly orders: OrdersService,
  ) {}

  // Full (amount omitted) or partial refund. Never more than paid minus earlier refunds.
  @Post(':id/refund')
  @HttpCode(200)
  async refund(@Param('id') id: string, @Body() dto: RefundDto, @CurrentAdmin() admin: AdminProfile) {
    const refund = await this.refunds.refund(id, dto, admin.email);
    return { refund, order: await this.orders.adminGet(id) };
  }

  // One action for a paid order: cancel it (stock goes back) and refund everything.
  @Post(':id/cancel-and-refund')
  @HttpCode(200)
  async cancelAndRefund(@Param('id') id: string, @Body() dto: CancelAndRefundDto, @CurrentAdmin() admin: AdminProfile) {
    const { refundRequired } = await this.lifecycle.changeStatus(id, 'CANCELLED', admin.email, { note: dto.reason });
    const refund = refundRequired ? await this.refunds.refund(id, { reason: dto.reason }, admin.email) : null;
    return { refund, order: await this.orders.adminGet(id) };
  }
}
