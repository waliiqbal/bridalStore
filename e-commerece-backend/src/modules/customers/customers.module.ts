import { Module } from '@nestjs/common';
import { CustomersAdminController } from './customers.admin.controller.js';
import { CustomersAdminService } from './customers.admin.service.js';

@Module({
  controllers: [CustomersAdminController],
  providers: [CustomersAdminService],
})
export class CustomersModule {}
