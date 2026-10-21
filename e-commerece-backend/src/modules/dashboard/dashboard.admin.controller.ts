import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';

@Controller('admin/dashboard')
export class DashboardAdminController {
  constructor(private readonly dashboard: DashboardService) {}

  // Sales today / this week / this month, the to-do counts, recent orders, low stock, best sellers
  @Get()
  summary() {
    return this.dashboard.summary();
  }
}
