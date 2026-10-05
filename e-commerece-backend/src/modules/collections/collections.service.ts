import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CategoriesService } from '../catalog/categories/categories.service.js';
import { CurrencyService } from '../pricing/currency.service.js';
import { buildCollectionWhere } from './collection-rules.js';
import { ruleContext } from './collection-products.js';
import type { CollectionQueryDto } from './dto/collection.dto.js';
import { ListingService } from './listing.service.js';

const PUBLIC_SELECT = {
  id: true,
  title: true,
  slug: true,
  type: true,
  matchAllRules: true,
  rules: { select: { field: true, operator: true, value: true } },
  defaultSort: true,
  description: true,
  seoContent: true,
  noticeText: true,
  bannerImageUrl: true,
  mobileBannerImageUrl: true,
  filterAttributeIds: true,
  isPublished: true,
  seoTitle: true,
  seoDescription: true,
} satisfies Prisma.CollectionSelect;

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencies: CurrencyService,
    private readonly categories: CategoriesService,
    private readonly listing: ListingService,
  ) {}

  async getPublic(slug: string, query: CollectionQueryDto) {
    const [collection, currency, index] = await Promise.all([
      this.prisma.collection.findUnique({ where: { slug }, select: PUBLIC_SELECT }),
      this.currencies.resolve(query.currency),
      this.categories.loadIndex(),
    ]);
    if (!collection?.isPublished) throw new NotFoundException('Collection not found');

    const listing = await this.listing.list({
      source: {
        base: buildCollectionWhere(collection, ruleContext(index)),
        type: collection.type,
        collectionId: collection.id,
        defaultSort: collection.defaultSort,
        filterAttributeIds: collection.filterAttributeIds,
      },
      query,
      currency,
      index,
    });

    const { rules: _r, matchAllRules: _m, filterAttributeIds: _f, isPublished: _p, ...info } =
      collection;
    return { collection: info, ...listing };
  }
}
