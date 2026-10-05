import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { CreateMenuItemDto, ReorderMenuItemsDto, UpdateMenuItemDto } from './dto/menu.dto.js';
import { MenusService } from './menus.service.js';

@Controller('admin/menus')
export class MenusAdminController {
  constructor(private readonly menus: MenusService) {}

  @Get()
  list() {
    return this.menus.listMenus();
  }

  @Get(':handle')
  tree(@Param('handle') handle: string) {
    return this.menus.getAdminTree(handle);
  }

  @Post(':handle/items')
  createItem(@Param('handle') handle: string, @Body() dto: CreateMenuItemDto) {
    return this.menus.createItem(handle, dto);
  }

  @Put(':handle/items/reorder')
  reorder(@Param('handle') handle: string, @Body() dto: ReorderMenuItemsDto) {
    return this.menus.reorder(handle, dto.parentId ?? null, dto.ids);
  }

  // Also moves an item: { "parentId": "<new parent>" } or null for top level
  @Patch(':handle/items/:itemId')
  updateItem(
    @Param('handle') handle: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menus.updateItem(handle, itemId, dto);
  }

  @Delete(':handle/items/:itemId')
  removeItem(@Param('handle') handle: string, @Param('itemId') itemId: string) {
    return this.menus.removeItem(handle, itemId);
  }
}
