import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { resolveSlug } from '../../../common/slug/slug.js';
import { assertNoNulls, definedOnly } from '../../../common/validation.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedirectsService } from '../../redirects/redirects.service.js';
import { CacheTags, RevalidationService } from '../../revalidation/revalidation.service.js';
import type {
  CreatePageDto,
  CreateSectionDto,
  UpdatePageDto,
  UpdateSectionDto,
} from './dto/page.dto.js';
import {
  isProductSection,
  MAX_PRODUCT_SECTIONS_PER_PAGE,
  referencedCollectionIds,
  validateSection,
} from './section-validation.js';

export const HOME_SLUG = 'home';

const SECTION_SELECT = {
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
  sortOrder: true,
  isActive: true,
} satisfies Prisma.PageSectionSelect;

const PAGE_SELECT = {
  id: true,
  title: true,
  slug: true,
  content: true,
  isPublished: true,
  showInFooter: true,
  seoTitle: true,
  seoDescription: true,
  createdAt: true,
  updatedAt: true,
  sections: { select: SECTION_SELECT, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.PageSelect;

@Injectable()
export class PagesAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redirects: RedirectsService,
    private readonly revalidation: RevalidationService,
  ) {}

  list() {
    return this.prisma.page.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        isPublished: true,
        showInFooter: true,
        updatedAt: true,
        _count: { select: { sections: true } },
      },
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
    });
  }

  async get(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id }, select: PAGE_SELECT });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async create(dto: CreatePageDto) {
    const slug = await resolveSlug(
      { explicit: dto.slug, source: dto.title, entity: 'page' },
      (prefix) => this.takenSlugs(prefix),
    );
    const page = await this.prisma.page.create({
      data: { ...dto, slug },
      select: PAGE_SELECT,
    });
    void this.revalidation.notify([CacheTags.page(page.slug), CacheTags.pages]);
    return page;
  }

  async update(id: string, dto: UpdatePageDto) {
    assertNoNulls(dto, ['title', 'slug', 'isPublished', 'showInFooter']);
    const current = await this.findSlug(id);
    const isHome = current.slug === HOME_SLUG;

    if (isHome && dto.slug !== undefined && dto.slug !== HOME_SLUG) {
      throw new BadRequestException("The home page's address can't be changed");
    }
    if (isHome && dto.isPublished === false) {
      throw new BadRequestException('The home page is always published');
    }

    const slug =
      dto.slug === undefined || isHome
        ? undefined
        : await resolveSlug(
            { explicit: dto.slug, source: '', entity: 'page' },
            (prefix) => this.takenSlugs(prefix, id),
          );
    const slugChanged = !!slug && slug !== current.slug;

    await this.prisma.$transaction(async (tx) => {
      await tx.page.update({ where: { id }, data: definedOnly({ ...dto, slug }) });
      if (slugChanged) await this.redirects.recordSlugChange(tx, 'page', current.slug, slug);
    });

    void this.revalidation.notify([
      CacheTags.page(current.slug),
      slugChanged && CacheTags.page(slug),
      CacheTags.pages,
      slugChanged && CacheTags.redirects,
    ].filter((t): t is string => !!t));
    return this.get(id);
  }

  async remove(id: string) {
    const { slug } = await this.findSlug(id);
    if (slug === HOME_SLUG) throw new BadRequestException("The home page can't be deleted");
    await this.prisma.page.delete({ where: { id } });
    void this.revalidation.notify([CacheTags.page(slug), CacheTags.pages]);
    return { deleted: true };
  }

  async addSection(pageId: string, dto: CreateSectionDto) {
    const { slug } = await this.findSlug(pageId);
    await this.validateSectionState(pageId, dto, null);

    const last = await this.prisma.pageSection.aggregate({
      where: { pageId },
      _max: { sortOrder: true },
    });
    const section = await this.prisma.pageSection.create({
      data: {
        ...sectionData(dto),
        type: dto.type,
        pageId,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
      select: SECTION_SELECT,
    });
    void this.revalidation.notify([CacheTags.page(slug)]);
    return section;
  }

  async updateSection(pageId: string, sectionId: string, dto: UpdateSectionDto) {
    assertNoNulls(dto, ['type', 'collectionIds', 'productLimit', 'isActive']);
    const { slug } = await this.findSlug(pageId);
    const current = await this.prisma.pageSection.findFirst({
      where: { id: sectionId, pageId },
      select: SECTION_SELECT,
    });
    if (!current) throw new NotFoundException('Section not found');

    // Validate the section as it will look after the change
    const merged = { ...current, ...definedOnly(dto) } as CreateSectionDto;
    await this.validateSectionState(pageId, merged, sectionId);

    const section = await this.prisma.pageSection.update({
      where: { id: sectionId },
      data: definedOnly({ ...sectionData(dto), type: dto.type }),
      select: SECTION_SELECT,
    });
    void this.revalidation.notify([CacheTags.page(slug)]);
    return section;
  }

  async removeSection(pageId: string, sectionId: string) {
    const { slug } = await this.findSlug(pageId);
    const { count } = await this.prisma.pageSection.deleteMany({ where: { id: sectionId, pageId } });
    if (!count) throw new NotFoundException('Section not found');
    void this.revalidation.notify([CacheTags.page(slug)]);
    return { deleted: true };
  }

  async reorderSections(pageId: string, ids: string[]) {
    const { slug } = await this.findSlug(pageId);
    const found = await this.prisma.pageSection.count({ where: { pageId, id: { in: ids } } });
    if (found !== ids.length) {
      throw new BadRequestException('One or more sections are not on this page');
    }
    await this.prisma.$transaction(
      ids.map((id, sortOrder) =>
        this.prisma.pageSection.update({ where: { id }, data: { sortOrder } }),
      ),
    );
    void this.revalidation.notify([CacheTags.page(slug)]);
    return { reordered: ids.length };
  }

  private async validateSectionState(
    pageId: string,
    section: CreateSectionDto,
    excludeSectionId: string | null,
  ) {
    const errors = validateSection(section);
    if (errors.length) throw new BadRequestException(errors);

    const ids = [...new Set(referencedCollectionIds(section))];
    const [found, productSections] = await Promise.all([
      ids.length ? this.prisma.collection.count({ where: { id: { in: ids } } }) : 0,
      isProductSection(section.type)
        ? this.prisma.pageSection.count({
            where: {
              pageId,
              type: { in: ['COLLECTION_GRID', 'PRODUCT_CAROUSEL'] },
              ...(excludeSectionId && { id: { not: excludeSectionId } }),
            },
          })
        : 0,
    ]);
    if (found !== ids.length) {
      throw new BadRequestException('One or more selected collections no longer exist');
    }
    if (productSections >= MAX_PRODUCT_SECTIONS_PER_PAGE) {
      throw new BadRequestException(
        `A page can have at most ${MAX_PRODUCT_SECTIONS_PER_PAGE} product sections`,
      );
    }
  }

  private async findSlug(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id }, select: { slug: true } });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  private async takenSlugs(prefix: string, excludeId?: string) {
    const rows = await this.prisma.page.findMany({
      where: { slug: { startsWith: prefix }, ...(excludeId && { id: { not: excludeId } }) },
      select: { slug: true },
    });
    return rows.map((r) => r.slug);
  }
}

// DTO → Prisma data. `settings: null` must become Prisma.JsonNull.
function sectionData(dto: Partial<CreateSectionDto>) {
  const { type: _type, settings, ...rest } = dto;
  return {
    ...rest,
    settings:
      settings === undefined
        ? undefined
        : settings === null
          ? Prisma.JsonNull
          : (settings as Prisma.InputJsonValue),
  };
}
