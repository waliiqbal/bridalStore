import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { resolveSlug } from '../../../common/slug/slug.js';
import { assertNoNulls, definedOnly } from '../../../common/validation.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { buildTree, CategoryIndex } from './category-tree.js';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

const INDEX_SELECT = { id: true, parentId: true, name: true, slug: true } as const;

export type CategoryIndexRow = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
};

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // The whole category table is small; one query gives tree lookups
  // (descendants, breadcrumbs, cycle checks) without per-level queries.
  async loadIndex(): Promise<CategoryIndex<CategoryIndexRow>> {
    const rows = await this.prisma.category.findMany({
      select: INDEX_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return new CategoryIndex(rows);
  }

  async publicTree() {
    const rows = await this.prisma.category.findMany({
      where: { isVisible: true },
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        showInMenu: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return buildTree(rows);
  }

  async adminTree() {
    const rows = await this.prisma.category.findMany({
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        imageUrl: true,
        sortOrder: true,
        isVisible: true,
        showInMenu: true,
        _count: { select: { products: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return buildTree(
      rows.map(({ _count, ...row }) => ({ ...row, productCount: _count.products })),
    );
  }

  async get(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const parentId = dto.parentId ?? null;
    if (parentId) await this.assertExists(parentId);

    const slug = await resolveSlug(
      { explicit: dto.slug, source: dto.name, entity: 'category' },
      (prefix) => this.takenSlugs(prefix),
    );
    const last = await this.prisma.category.aggregate({
      where: { parentId },
      _max: { sortOrder: true },
    });

    return this.prisma.category.create({
      data: {
        ...dto,
        slug,
        parentId,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    assertNoNulls(dto, ['name', 'slug', 'isVisible', 'showInMenu']);
    await this.get(id);

    if (dto.parentId) {
      const index = await this.loadIndex();
      if (!index.get(dto.parentId)) {
        throw new BadRequestException('The selected parent category does not exist');
      }
      if (index.wouldCreateCycle(id, dto.parentId)) {
        throw new BadRequestException(
          "A category can't be placed inside itself or one of its own sub-categories",
        );
      }
    }

    const slug =
      dto.slug === undefined
        ? undefined
        : await resolveSlug(
            { explicit: dto.slug, source: dto.slug ?? '', entity: 'category' },
            (prefix) => this.takenSlugs(prefix, id),
          );

    return this.prisma.category.update({
      where: { id },
      data: definedOnly({ ...dto, slug }),
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { _count: { select: { children: true, products: true } } },
    });
    if (!category) throw new NotFoundException('Category not found');

    if (category._count.children > 0) {
      throw new ConflictException(
        'This category has sub-categories. Move or delete them first.',
      );
    }
    if (category._count.products > 0) {
      throw new ConflictException(
        `This category has ${category._count.products} product(s). Move them to another category first.`,
      );
    }

    // Smart-collection rules pointing at this category would silently match nothing.
    await this.prisma.$transaction([
      this.prisma.collectionRule.deleteMany({
        where: { field: 'CATEGORY', value: id },
      }),
      this.prisma.category.delete({ where: { id } }),
    ]);
    return { deleted: true };
  }

  async reorder(ids: string[]) {
    const found = await this.prisma.category.count({ where: { id: { in: ids } } });
    if (found !== ids.length) {
      throw new BadRequestException('One or more categories no longer exist');
    }
    await this.prisma.$transaction(
      ids.map((id, sortOrder) =>
        this.prisma.category.update({ where: { id }, data: { sortOrder } }),
      ),
    );
    return { reordered: ids.length };
  }

  private async assertExists(id: string) {
    const exists = await this.prisma.category.count({ where: { id } });
    if (!exists) {
      throw new BadRequestException('The selected parent category does not exist');
    }
  }

  private async takenSlugs(prefix: string, excludeId?: string) {
    const rows = await this.prisma.category.findMany({
      where: {
        slug: { startsWith: prefix },
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { slug: true },
    });
    return rows.map((r) => r.slug);
  }
}
