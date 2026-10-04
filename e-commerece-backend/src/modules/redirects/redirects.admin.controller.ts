import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  CreateRedirectDto,
  RedirectListQueryDto,
  UpdateRedirectDto,
} from './dto/redirect.dto.js';
import { RedirectsService } from './redirects.service.js';

@Controller('admin/redirects')
export class RedirectsAdminController {
  constructor(private readonly redirects: RedirectsService) {}

  @Get()
  list(@Query() query: RedirectListQueryDto) {
    return this.redirects.list(query);
  }

  @Post()
  create(@Body() dto: CreateRedirectDto) {
    return this.redirects.create(dto.fromPath, dto.toPath);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRedirectDto) {
    return this.redirects.update(id, dto.toPath);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.redirects.remove(id);
  }
}
