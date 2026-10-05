import { Controller, Get } from '@nestjs/common';
import { FaqsService } from './faqs.service.js';

@Controller('faqs')
export class FaqsController {
  constructor(private readonly faqs: FaqsService) {}

  @Get()
  list() {
    return this.faqs.listPublic();
  }
}
