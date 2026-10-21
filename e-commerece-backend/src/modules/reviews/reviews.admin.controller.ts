import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { AdminReviewListQueryDto, UpdateReviewDto } from './dto/review.dto.js';
import { ReviewsService } from './reviews.service.js';

@Controller('admin/reviews')
export class ReviewsAdminController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(@Query() query: AdminReviewListQueryDto) {
    return this.reviews.listAdmin(query);
  }

  // { PENDING, APPROVED, REJECTED } for the tabs
  @Get('counts')
  counts() {
    return this.reviews.counts();
  }

  // Approve / hide, and write the shop's public reply
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReviewDto) {
    return this.reviews.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reviews.remove(id);
  }
}
