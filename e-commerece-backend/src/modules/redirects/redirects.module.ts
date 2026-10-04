import { Module } from '@nestjs/common';
import { RedirectsAdminController } from './redirects.admin.controller.js';
import { RedirectsController } from './redirects.controller.js';
import { RedirectsService } from './redirects.service.js';

@Module({
  controllers: [RedirectsController, RedirectsAdminController],
  providers: [RedirectsService],
  exports: [RedirectsService],
})
export class RedirectsModule {}
