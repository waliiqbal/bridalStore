import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CreateEnquiryDto } from './dto/enquiry.dto.js';
import { BUDGET_OPTIONS, OUTFIT_TYPE_OPTIONS } from './enquiry-options.js';
import { EnquiriesService } from './enquiries.service.js';

const MINUTE = 60_000;

// The public "tell us what you are looking for" form
@Controller('enquiries')
@UseGuards(ThrottlerGuard)
export class EnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  // The choices the form shows (so the website and database always agree)
  @Get('options')
  @Throttle({ default: { limit: 60, ttl: MINUTE } })
  options() {
    return { budgets: BUDGET_OPTIONS, outfitTypes: OUTFIT_TYPE_OPTIONS };
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: MINUTE } })
  create(@Body() dto: CreateEnquiryDto) {
    return this.enquiries.create(dto);
  }
}
