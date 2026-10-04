import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CartModule } from '../cart/cart.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { SchedulerService } from './scheduler.service.js';

@Module({
  imports: [ScheduleModule.forRoot(), OrdersModule, CartModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
