import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module.js';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';

@Module({
  imports: [PricingModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
