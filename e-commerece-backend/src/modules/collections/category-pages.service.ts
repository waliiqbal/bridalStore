import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CategoriesService } from '../catalog/categories/categories.service.js';
import { CurrencyService } from '../pricing/currency.service.js';
import type { CollectionQueryDto } from './dto/collection.dto.js';
import { ListingService } from './listing.service.js';

// Category pages: same listing, sorting, filters and facets as collections,
// over every product in the category and its sub-categories.
@Injectable()
export class CategoryPagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencies: CurrencyService,
    private readonly categories: CategoriesService,
    private readonly listing: ListingService,
  ) {}

  async getPublic(slug: string, query: CollectionQueryDto) {
    const [category, currency, index] = await Promise.all([
      this.prisma.category.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          imageUrl: true,
          seoTitle: true,
          seoDescription: true,
        },
      }),
      this.currencies.resolve(query.currency),
      this.categories.loadIndex(),
    ]);

    // Hidden categories (or ones under a hidden parent) are not public
    const ancestry = category ? index.ancestry(category.id) : [];
    if (!category || ancestry.some((row) => !row.isVisible)) {
      throw new NotFoundException('Category not found');
    }

    const listing = await this.listing.list({
      source: {
        base: { status: 'ACTIVE', categoryId: { in: index.descendantIds(category.id) } },
        type: 'SMART',
        defaultSort: 'BEST_SELLING',
        filterAttributeIds: [],
      },
      query,
      currency,
      index,
    });

    const children = index.rows
      .filter((row) => row.parentId === category.id && row.isVisible)
      .map(({ name, slug: childSlug }) => ({ name, slug: childSlug }));

    return {
      category: {
        ...category,
        breadcrumb: ancestry.map(({ name, slug: s }) => ({ name, slug: s })),
        children,
      },
      ...listing,
    };
  }
}
