import { Controller, Get, Param } from '@nestjs/common';
import { MenusService } from './menus.service.js';

@Controller('menus')
export class MenusController {
  constructor(private readonly menus: MenusService) {}

  // GET /api/menus/main, /api/menus/footer
  @Get(':handle')
  get(@Param('handle') handle: string) {
    return this.menus.getPublic(handle);
  }
}
