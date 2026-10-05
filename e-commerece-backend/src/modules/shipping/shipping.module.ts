import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { ShippingAdminController } from './shipping.admin.controller.js';
import { ShippingController } from './shipping.controller.js';
import { ShippingService } from './shipping.service.js';

@Module({
  imports: [PricingModule, CartModule],
  controllers: [ShippingController, ShippingAdminController],
  providers: [ShippingService],
})
export class ShippingModule {}
