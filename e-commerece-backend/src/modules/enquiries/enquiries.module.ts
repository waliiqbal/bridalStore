import { Module } from '@nestjs/common';
import { EnquiriesAdminController } from './enquiries.admin.controller.js';
import { EnquiriesController } from './enquiries.controller.js';
import { EnquiriesService } from './enquiries.service.js';

@Module({
  controllers: [EnquiriesController, EnquiriesAdminController],
  providers: [EnquiriesService],
})
export class EnquiriesModule {}
