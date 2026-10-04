import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CategoriesService } from '../../catalog/categories/categories.service.js';
import {
  PRODUCT_CARD_SELECT,
  toProductCard,
  type ProductCard,
} from '../../catalog/products/product-card.js';
import { ruleContext, SORT_ORDER } from '../../collections/collection-products.js';
import { buildCollectionWhere, type RuleContext } from '../../collections/collection-rules.js';
import { CurrencyService } from '../../pricing/currency.service.js';
import {
  isProductSection,
  MAX_PRODUCT_SECTIONS_PER_PAGE,
} from './section-validation.js';

const PUBLIC_PAGE_SELECT = {
  title: true,
  slug: true,
  content: true,
  isPublished: true,
  seoTitle: true,
  seoDescription: true,
  updatedAt: true,
  sections: {
    where: { isActive: true },
    select: {
      id: true,
      type: true,
      title: true,
      subtitle: true,
      body: true,
      imageUrl: true,
      linkUrl: true,
      buttonText: true,
      collectionId: true,
      collectionIds: true,
      productLimit: true,
      settings: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.PageSelect;

const SECTION_COLLECTION_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  bannerImageUrl: true,
  mobileBannerImageUrl: true,
  type: true,
  matchAllRules: true,
  defaultSort: true,
  rules: { select: { field: true, operator: true, value: true } },
} satisfies Prisma.CollectionSelect;

type SectionCollection = Prisma.CollectionGetPayload<{ select: typeof SECTION_COLLECTION_SELECT }>;

type SectionBase = {
  id: string;
  title: string | null;
  subtitle: string | null;
  settings: Prisma.JsonValue;
};

// Response shape per section type (the frontend switches on `type`).
export type PublicSection = SectionBase &
  (
    | {
        type: 'COLLECTION_GRID' | 'PRODUCT_CAROUSEL';
        linkUrl: string | null;
        buttonText: string | null;
        collection: { title: string; slug: string };
        products: ProductCard[];
      }
    | {
        type: 'COLLECTION_TILES';
        collections: { title: string; slug: string; imageUrl: string | null; mobileImageUrl: string | null }[];
      }
    | { type: 'FAQ'; faqs: { id: string; question: string; answer: string }[] }
    | { type: 'RICH_TEXT'; body: string | null }
    | {
        type: 'HERO_BANNER' | 'IMAGE_WITH_TEXT';
        body: string | null;
        imageUrl: string | null;
        linkUrl: string | null;
        buttonText: string | null;
      }
  );

@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencies: CurrencyService,
    private readonly categories: CategoriesService,
  ) {}

  /**
   * Query budget (fixed, independent of section count):
   *   page+sections, currency, category tree → collections, FAQs →
   *   one id-only query per distinct product collection (≤ 12, in parallel) →
   *   one batched card query for every product on the page.
   */
  async getBySlug(slug: string, currencyCode?: string) {
    const [page, currency, index] = await Promise.all([
      this.prisma.page.findUnique({ where: { slug }, select: PUBLIC_PAGE_SELECT }),
      this.currencies.resolve(currencyCode),
      this.categories.loadIndex(),
    ]);
    if (!page?.isPublished) throw new NotFoundException('Page not found');

    const collectionIds = [
      ...new Set(
        page.sections.flatMap((s) =>
          isProductSection(s.type) ? (s.collectionId ? [s.collectionId] : []) : s.type === 'COLLECTION_TILES' ? s.collectionIds : [],
        ),
      ),
    ];
    const hasFaq = page.sections.some((s) => s.type === 'FAQ');

    const [collectionRows, faqs] = await Promise.all([
      collectionIds.length
        ? this.prisma.collection.findMany({
            where: { id: { in: collectionIds }, isPublished: true },
            select: SECTION_COLLECTION_SELECT,
          })
        : [],
      hasFaq
        ? this.prisma.faq.findMany({
            where: { isActive: true },
            select: { id: true, question: true, answer: true },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          })
        : [],
    ]);
    const collections = new Map(collectionRows.map((c) => [c.id, c]));

    // Product sections whose collection is published, capped per page.
    const productSections = page.sections
      .filter((s) => isProductSection(s.type) && s.collectionId && collections.has(s.collectionId))
      .slice(0, MAX_PRODUCT_SECTIONS_PER_PAGE);
    const productIdsByCollection = await this.productIdsByCollection(
      productSections.map((s) => ({ collection: collections.get(s.collectionId!)!, limit: s.productLimit })),
      ruleContext(index),
    );

    const allIds = [...new Set([...productIdsByCollection.values()].flat())];
    const cardRows = allIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: allIds }, status: 'ACTIVE' },
          select: PRODUCT_CARD_SELECT,
        })
      : [];
    const cards = new Map<string, ProductCard>(cardRows.map((row) => [row.id, toProductCard(row, currency)]));
    const rendered = new Set(productSections.map((s) => s.id));

    const sections = page.sections.flatMap((section): PublicSection[] => {
      const base: SectionBase = {
        id: section.id,
        title: section.title,
        subtitle: section.subtitle,
        settings: section.settings,
      };
      switch (section.type) {
        case 'COLLECTION_GRID':
        case 'PRODUCT_CAROUSEL': {
          if (!rendered.has(section.id)) return [];
          const collection = collections.get(section.collectionId!)!;
          const ids = (productIdsByCollection.get(collection.id) ?? []).slice(0, section.productLimit);
          return [
            {
              ...base,
              type: section.type,
              linkUrl: section.linkUrl,
              buttonText: section.buttonText,
              collection: { title: collection.title, slug: collection.slug },
              products: ids.map((id) => cards.get(id)).filter((c): c is ProductCard => !!c),
            },
          ];
        }
        case 'COLLECTION_TILES': {
          const tiles = section.collectionIds
            .map((id) => collections.get(id))
            .filter((c): c is SectionCollection => !!c)
            .map((c) => ({
              title: c.title,
              slug: c.slug,
              imageUrl: c.bannerImageUrl,
              mobileImageUrl: c.mobileBannerImageUrl,
            }));
          return tiles.length ? [{ ...base, type: section.type, collections: tiles }] : [];
        }
        case 'FAQ':
          return [{ ...base, type: section.type, faqs }];
        case 'RICH_TEXT':
          return [{ ...base, type: section.type, body: section.body }];
        case 'HERO_BANNER':
        case 'IMAGE_WITH_TEXT':
          return [
            {
              ...base,
              type: section.type,
              body: section.body,
              imageUrl: section.imageUrl,
              linkUrl: section.linkUrl,
              buttonText: section.buttonText,
            },
          ];
      }
    });

    const { isPublished: _p, sections: _s, ...info } = page;
    return { ...info, currency: currency.code, sections };
  }

  // One id-only query per distinct collection (sections sharing a collection
  // share the query, using the largest limit), all in parallel.
  private async productIdsByCollection(
    sections: { collection: SectionCollection; limit: number }[],
    ctx: RuleContext,
  ): Promise<Map<string, string[]>> {
    const limits = new Map<string, { collection: SectionCollection; limit: number }>();
    for (const { collection, limit } of sections) {
      const current = limits.get(collection.id);
      if (!current || current.limit < limit) limits.set(collection.id, { collection, limit });
    }

    const entries = await Promise.all(
      [...limits.values()].map(async ({ collection, limit }) => {
        if (collection.type === 'MANUAL' && collection.defaultSort === 'MANUAL') {
          const links = await this.prisma.collectionProduct.findMany({
            where: { collectionId: collection.id, product: { status: 'ACTIVE' } },
            select: { productId: true },
            orderBy: [{ sortOrder: 'asc' }, { productId: 'asc' }],
            take: limit,
          });
          return [collection.id, links.map((l) => l.productId)] as const;
        }
        const sort = collection.defaultSort === 'MANUAL' ? 'BEST_SELLING' : collection.defaultSort;
        const rows = await this.prisma.product.findMany({
          where: buildCollectionWhere(collection, ctx),
          select: { id: true },
          orderBy: SORT_ORDER[sort],
          take: limit,
        });
        return [collection.id, rows.map((r) => r.id)] as const;
      }),
    );
    return new Map(entries);
  }
}
