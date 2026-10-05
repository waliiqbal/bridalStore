import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { OrderLookupDto } from './dto/orders.dto.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
@UseGuards(ThrottlerGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // Guest order tracking. Same 404 for a wrong email and a missing order.
  @Post('lookup')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  lookup(@Body() dto: OrderLookupDto) {
    return this.orders.lookup(dto.orderNumber, dto.email);
  }
}
