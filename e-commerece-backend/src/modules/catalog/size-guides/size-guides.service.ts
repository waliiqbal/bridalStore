import { Injectable, NotFoundException } from '@nestjs/common';
import { assertNoNulls, definedOnly } from '../../../common/validation.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CacheTags, RevalidationService } from '../../revalidation/revalidation.service.js';
import type { CreateSizeGuideDto, UpdateSizeGuideDto } from './dto/size-guide.dto.js';

const SELECT = {
  id: true,
  name: true,
  content: true,
  updatedAt: true,
  _count: { select: { products: true } },
} as const;

@Injectable()
export class SizeGuidesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  // Size guides show on product pages.
  private notify() {
    void this.revalidation.notify([CacheTags.products]);
  }

  list() {
    return this.prisma.sizeGuide.findMany({ select: SELECT, orderBy: { name: 'asc' } });
  }

  async get(id: string) {
    const guide = await this.prisma.sizeGuide.findUnique({ where: { id }, select: SELECT });
    if (!guide) throw new NotFoundException('Size guide not found');
    return guide;
  }

  async create(dto: CreateSizeGuideDto) {
    const guide = await this.prisma.sizeGuide.create({ data: dto, select: SELECT });
    this.notify();
    return guide;
  }

  async update(id: string, dto: UpdateSizeGuideDto) {
    assertNoNulls(dto, ['name', 'content']);
    await this.get(id);
    const guide = await this.prisma.sizeGuide.update({
      where: { id },
      data: definedOnly(dto),
      select: SELECT,
    });
    this.notify();
    return guide;
  }

  // Products using it simply stop showing a size guide (onDelete: SetNull).
  async remove(id: string) {
    await this.get(id);
    await this.prisma.sizeGuide.delete({ where: { id } });
    this.notify();
    return { deleted: true };
  }
}
