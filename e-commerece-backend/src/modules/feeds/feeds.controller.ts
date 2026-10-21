import { Controller, Get, Header } from '@nestjs/common';
import { FeedsService } from './feeds.service.js';

@Controller('feeds')
export class FeedsController {
  constructor(private readonly feeds: FeedsService) {}

  // Used by the website to build sitemap.xml
  @Get('sitemap')
  sitemap() {
    return this.feeds.sitemap();
  }

  // Give this address to Facebook/Instagram Commerce Manager as the product feed
  @Get('meta.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=900')
  metaFeed() {
    return this.feeds.metaFeed();
  }
}
