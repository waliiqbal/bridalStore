import { Module } from '@nestjs/common';
import { FeedsController } from './feeds.controller.js';
import { FeedsService } from './feeds.service.js';

@Module({
  controllers: [FeedsController],
  providers: [FeedsService],
})
export class FeedsModule {}
