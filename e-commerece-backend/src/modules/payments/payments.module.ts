import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module.js';
import { PaymentsAdminController } from './payments.admin.controller.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { paymentAdaptersProvider } from './providers/adapters.factory.js';
import { RefundsService } from './refunds.service.js';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';

@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController, WebhooksController, PaymentsAdminController],
  providers: [paymentAdaptersProvider, PaymentsService, RefundsService, WebhooksService],
  exports: [PaymentsService, RefundsService],
})
export class PaymentsModule {}
