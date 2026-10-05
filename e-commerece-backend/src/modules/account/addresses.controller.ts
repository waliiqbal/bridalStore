import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { CurrentCustomer, type CustomerProfile } from '../auth/customer/customer-session.js';
import { AddressesService } from './addresses.service.js';
import { CreateAddressDto, UpdateAddressDto } from './dto/account.dto.js';

@Controller('account/addresses')
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  // Default address first
  @Get()
  list(@CurrentCustomer() customer: CustomerProfile) {
    return this.addresses.list(customer.id);
  }

  @Post()
  create(@CurrentCustomer() customer: CustomerProfile, @Body() dto: CreateAddressDto) {
    return this.addresses.create(customer.id, dto);
  }

  @Patch(':id')
  update(@CurrentCustomer() customer: CustomerProfile, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.addresses.update(customer.id, id, dto);
  }

  @Post(':id/default')
  @HttpCode(200)
  setDefault(@CurrentCustomer() customer: CustomerProfile, @Param('id') id: string) {
    return this.addresses.setDefault(customer.id, id);
  }

  @Delete(':id')
  remove(@CurrentCustomer() customer: CustomerProfile, @Param('id') id: string) {
    return this.addresses.remove(customer.id, id);
  }
}
