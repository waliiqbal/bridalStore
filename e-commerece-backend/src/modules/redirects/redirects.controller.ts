import { Controller, Get, Query } from '@nestjs/common';
import { ResolveRedirectQueryDto } from './dto/redirect.dto.js';
import { RedirectsService } from './redirects.service.js';

@Controller('redirects')
export class RedirectsController {
  constructor(private readonly redirects: RedirectsService) {}

  // Used by the storefront when a path 404s: { toPath, statusCode } or 404
  @Get('resolve')
  resolve(@Query() query: ResolveRedirectQueryDto) {
    return this.redirects.resolve(query.path);
  }
}
