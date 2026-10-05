import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { AccountController } from './account.controller.js';
import { AddressesController } from './addresses.controller.js';
import { AddressesService } from './addresses.service.js';
import { ProfileService } from './profile.service.js';
import { WishlistController } from './wishlist.controller.js';
import { WishlistService } from './wishlist.service.js';

@Module({
  imports: [AuthModule, PricingModule],
  controllers: [AccountController, AddressesController, WishlistController],
  providers: [ProfileService, AddressesService, WishlistService],
})
export class AccountModule {}
