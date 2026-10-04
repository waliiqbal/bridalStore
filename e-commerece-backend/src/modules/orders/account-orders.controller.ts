import { Controller, Get, Param, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/pagination/pagination.js';
import { CurrentCustomer, type CustomerProfile } from '../auth/customer/customer-session.js';
import { OrdersService } from './orders.service.js';

// /api/account/orders — signed-in customers only (CustomerGuard)
@Controller('account/orders')
export class AccountOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@CurrentCustomer() customer: CustomerProfile, @Query() query: PaginationQueryDto) {
    return this.orders.listForCustomer(customer.id, query);
  }

  @Get(':orderNumber')
  get(@CurrentCustomer() customer: CustomerProfile, @Param('orderNumber') orderNumber: string) {
    return this.orders.getForCustomer(customer.id, orderNumber);
  }
}
