import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentCustomer, type CustomerProfile } from '../auth/customer/customer-session.js';
import { AddWishlistItemDto, WishlistQueryDto } from './dto/account.dto.js';
import { WishlistService } from './wishlist.service.js';

@Controller('account/wishlist')
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  // Paginated product cards (same shape as collection listings)
  @Get()
  list(@CurrentCustomer() customer: CustomerProfile, @Query() query: WishlistQueryDto) {
    return this.wishlist.list(customer.id, query, query.currency);
  }

  // { productIds } — for filling in heart icons across the shop
  @Get('ids')
  ids(@CurrentCustomer() customer: CustomerProfile) {
    return this.wishlist.ids(customer.id);
  }

  @Post()
  add(@CurrentCustomer() customer: CustomerProfile, @Body() dto: AddWishlistItemDto) {
    return this.wishlist.add(customer.id, dto.productId);
  }

  @Delete(':productId')
  remove(@CurrentCustomer() customer: CustomerProfile, @Param('productId') productId: string) {
    return this.wishlist.remove(customer.id, productId);
  }
}
