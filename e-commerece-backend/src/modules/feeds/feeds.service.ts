import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { buildMetaFeed } from './meta-feed.js';

const MAX_PRODUCTS = 5000;

@Injectable()
export class FeedsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // Every public page of the shop, for sitemap.xml (the website builds the XML)
  async sitemap() {
    const [products, collections, categories, pages] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: 'ACTIVE' },
        select: { slug: true, updatedAt: true },
        orderBy: { id: 'asc' },
        take: 50_000,
      }),
      this.prisma.collection.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.category.findMany({
        where: { isVisible: true },
        select: { slug: true, updatedAt: true },
        orderBy: { id: 'asc' },
      }),
      // The homepage (slug "home") is the site root, so the website adds it itself
      this.prisma.page.findMany({
        where: { isPublished: true, slug: { not: 'home' } },
        select: { slug: true, updatedAt: true },
        orderBy: { id: 'asc' },
      }),
    ]);
    return { products, collections, categories, pages };
  }

  async metaFeed(): Promise<string> {
    const [products, settings] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: 'ACTIVE' },
        select: {
          name: true,
          slug: true,
          description: true,
          price: true,
          compareAtPrice: true,
          images: { select: { url: true, colour: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
          variants: {
            where: { isActive: true },
            select: { sku: true, size: true, colour: true, price: true, stock: true },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: { id: 'asc' },
        take: MAX_PRODUCTS,
      }),
      this.prisma.storeSettings.findUnique({ where: { id: 1 }, select: { storeName: true } }),
    ]);
    return buildMetaFeed(products, {
      siteUrl: this.config.get('STOREFRONT_URL', { infer: true }),
      brand: settings?.storeName ?? 'Malikah Bridal Studio',
    });
  }
}
