import { Module } from '@nestjs/common';
import { DashboardAdminController } from './dashboard.admin.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  controllers: [DashboardAdminController],
  providers: [DashboardService],
})
export class DashboardModule {}
