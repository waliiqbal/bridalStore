import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CustomersAdminService } from './customers.admin.service.js';
import { AdminCustomerListQueryDto, UpdateCustomerDto } from './dto/customers.dto.js';

@Controller('admin/customers')
export class CustomersAdminController {
  constructor(private readonly customers: CustomersAdminService) {}

  @Get()
  list(@Query() query: AdminCustomerListQueryDto) {
    return this.customers.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.customers.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.setActive(id, dto.isActive);
  }
}
