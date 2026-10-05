import { Controller, Get, Query } from '@nestjs/common';
import {
  Cookie,
  CurrentCustomer,
  CustomerAuth,
  type CustomerProfile,
} from '../auth/customer/customer-session.js';
import { CART_COOKIE } from '../cart/cart.controller.js';
import { ShippingOptionsQueryDto } from './dto/shipping.dto.js';
import { ShippingService } from './shipping.service.js';

@Controller('shipping')
@CustomerAuth('optional')
export class ShippingController {
  constructor(private readonly shipping: ShippingService) {}

  // Rates for a country, with "free for your bag" based on the current cart
  @Get('options')
  options(
    @Cookie(CART_COOKIE) token: string | undefined,
    @CurrentCustomer() customer: CustomerProfile | undefined,
    @Query() query: ShippingOptionsQueryDto,
  ) {
    return this.shipping.options({ token, customerId: customer?.id }, query.country, query.currency);
  }
}
