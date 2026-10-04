import { Module } from '@nestjs/common';
import { AccountOrdersController } from './account-orders.controller.js';
import { OrderLifecycleService } from './order-lifecycle.service.js';
import { OrdersAdminController } from './orders.admin.controller.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  controllers: [AccountOrdersController, OrdersController, OrdersAdminController],
  providers: [OrdersService, OrderLifecycleService],
  exports: [OrdersService, OrderLifecycleService],
})
export class OrdersModule {}
