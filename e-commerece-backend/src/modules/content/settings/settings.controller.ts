import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service.js';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  // Public, safe fields only (contact details, social links, tracking IDs)
  @Get()
  get() {
    return this.settings.getPublic();
  }
}
