import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { resolveSlug } from '../../../common/slug/slug.js';
import { assertNoNulls, definedOnly } from '../../../common/validation.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CacheTags, RevalidationService } from '../../revalidation/revalidation.service.js';
import type {
  CreateAttributeDto,
  CreateAttributeValueDto,
  UpdateAttributeDto,
  UpdateAttributeValueDto,
} from './dto/attribute.dto.js';

const ATTRIBUTE_SELECT = {
  id: true,
  name: true,
  slug: true,
  isFilterable: true,
  sortOrder: true,
  values: {
    select: { id: true, value: true, slug: true, sortOrder: true },
    orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
  },
} satisfies Prisma.AttributeSelect;

@Injectable()
export class AttributesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  // Filters and product attributes appear on every listing and product page.
  private notify() {
    void this.revalidation.notify([CacheTags.products]);
  }

  list() {
    return this.prisma.attribute.findMany({
      select: ATTRIBUTE_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async get(id: string) {
    const attribute = await this.prisma.attribute.findUnique({
      where: { id },
      select: ATTRIBUTE_SELECT,
    });
    if (!attribute) throw new NotFoundException('Filter not found');
    return attribute;
  }

  async create(dto: CreateAttributeDto) {
    const slug = await resolveSlug(
      { explicit: dto.slug, source: dto.name, entity: 'filter' },
      (prefix) => this.takenAttributeSlugs(prefix),
    );
    const last = await this.prisma.attribute.aggregate({ _max: { sortOrder: true } });
    const result = await this.prisma.attribute.create({
      data: { ...dto, slug, sortOrder: (last._max.sortOrder ?? -1) + 1 },
      select: ATTRIBUTE_SELECT,
    });
    this.notify();
    return result;
  }

  async update(id: string, dto: UpdateAttributeDto) {
    assertNoNulls(dto, ['name', 'slug', 'isFilterable']);
    await this.get(id);
    const slug =
      dto.slug === undefined
        ? undefined
        : await resolveSlug(
            { explicit: dto.slug, source: '', entity: 'filter' },
            (prefix) => this.takenAttributeSlugs(prefix, id),
          );
    const result = await this.prisma.attribute.update({
      where: { id },
      data: definedOnly({ ...dto, slug }),
      select: ATTRIBUTE_SELECT,
    });
    this.notify();
    return result;
  }

  async remove(id: string) {
    const attribute = await this.get(id);
    const valueIds = attribute.values.map((v) => v.id);

    await this.prisma.$transaction([
      this.prisma.collectionRule.deleteMany({
        where: { field: 'ATTRIBUTE', value: { in: valueIds } },
      }),
      // Parameterised; removes this filter from collection pages that listed it.
      this.prisma.$executeRaw`
        UPDATE "Collection"
        SET "filterAttributeIds" = array_remove("filterAttributeIds", ${id})
        WHERE ${id} = ANY("filterAttributeIds")`,
      this.prisma.attribute.delete({ where: { id } }),
    ]);
    this.notify();
    return { deleted: true };
  }

  async reorder(ids: string[]) {
    const found = await this.prisma.attribute.count({ where: { id: { in: ids } } });
    if (found !== ids.length) {
      throw new BadRequestException('One or more filters no longer exist');
    }
    await this.prisma.$transaction(
      ids.map((id, sortOrder) =>
        this.prisma.attribute.update({ where: { id }, data: { sortOrder } }),
      ),
    );
    this.notify();
    return { reordered: ids.length };
  }

  async createValue(attributeId: string, dto: CreateAttributeValueDto) {
    await this.get(attributeId);
    const slug = await resolveSlug(
      { explicit: dto.slug, source: dto.value, entity: 'option' },
      (prefix) => this.takenValueSlugs(attributeId, prefix),
    );
    const last = await this.prisma.attributeValue.aggregate({
      where: { attributeId },
      _max: { sortOrder: true },
    });
    const result = await this.prisma.attributeValue.create({
      data: {
        attributeId,
        value: dto.value,
        slug,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
      select: { id: true, value: true, slug: true, sortOrder: true },
    });
    this.notify();
    return result;
  }

  async updateValue(attributeId: string, valueId: string, dto: UpdateAttributeValueDto) {
    assertNoNulls(dto, ['value', 'slug']);
    await this.getValue(attributeId, valueId);
    const slug =
      dto.slug === undefined
        ? undefined
        : await resolveSlug(
            { explicit: dto.slug, source: '', entity: 'option' },
            (prefix) => this.takenValueSlugs(attributeId, prefix, valueId),
          );
    const result = await this.prisma.attributeValue.update({
      where: { id: valueId },
      data: definedOnly({ value: dto.value, slug }),
      select: { id: true, value: true, slug: true, sortOrder: true },
    });
    this.notify();
    return result;
  }

  async removeValue(attributeId: string, valueId: string) {
    await this.getValue(attributeId, valueId);
    await this.prisma.$transaction([
      this.prisma.collectionRule.deleteMany({
        where: { field: 'ATTRIBUTE', value: valueId },
      }),
      this.prisma.attributeValue.delete({ where: { id: valueId } }),
    ]);
    this.notify();
    return { deleted: true };
  }

  async reorderValues(attributeId: string, ids: string[]) {
    const found = await this.prisma.attributeValue.count({
      where: { attributeId, id: { in: ids } },
    });
    if (found !== ids.length) {
      throw new BadRequestException('One or more options no longer exist');
    }
    await this.prisma.$transaction(
      ids.map((id, sortOrder) =>
        this.prisma.attributeValue.update({ where: { id }, data: { sortOrder } }),
      ),
    );
    this.notify();
    return { reordered: ids.length };
  }

  private async getValue(attributeId: string, valueId: string) {
    const value = await this.prisma.attributeValue.findFirst({
      where: { id: valueId, attributeId },
      select: { id: true },
    });
    if (!value) throw new NotFoundException('Filter option not found');
    return value;
  }

  private async takenAttributeSlugs(prefix: string, excludeId?: string) {
    const rows = await this.prisma.attribute.findMany({
      where: { slug: { startsWith: prefix }, ...(excludeId && { id: { not: excludeId } }) },
      select: { slug: true },
    });
    return rows.map((r) => r.slug);
  }

  private async takenValueSlugs(attributeId: string, prefix: string, excludeId?: string) {
    const rows = await this.prisma.attributeValue.findMany({
      where: {
        attributeId,
        slug: { startsWith: prefix },
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { slug: true },
    });
    return rows.map((r) => r.slug);
  }
}
