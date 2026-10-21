import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentCustomer, CustomerAuth, type CustomerProfile } from '../auth/customer/customer-session.js';
import { CreateReviewDto, ReviewListQueryDto } from './dto/review.dto.js';
import { ReviewsService } from './reviews.service.js';

@Controller('products/:slug/reviews')
@UseGuards(ThrottlerGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  // Approved reviews + { count, average }
  @Get()
  list(@Param('slug') slug: string, @Query() query: ReviewListQueryDto) {
    return this.reviews.listForProduct(slug, query);
  }

  // Signed-in customers only; one review per product
  @Post()
  @CustomerAuth('required')
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(
    @Param('slug') slug: string,
    @CurrentCustomer() customer: CustomerProfile,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.create(slug, customer, dto);
  }
}
