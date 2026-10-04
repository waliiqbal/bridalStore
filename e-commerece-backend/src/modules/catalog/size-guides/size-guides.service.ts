import { Injectable, NotFoundException } from '@nestjs/common';
import { assertNoNulls, definedOnly } from '../../../common/validation.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
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
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.sizeGuide.findMany({ select: SELECT, orderBy: { name: 'asc' } });
  }

  async get(id: string) {
    const guide = await this.prisma.sizeGuide.findUnique({ where: { id }, select: SELECT });
    if (!guide) throw new NotFoundException('Size guide not found');
    return guide;
  }

  create(dto: CreateSizeGuideDto) {
    return this.prisma.sizeGuide.create({ data: dto, select: SELECT });
  }

  async update(id: string, dto: UpdateSizeGuideDto) {
    assertNoNulls(dto, ['name', 'content']);
    await this.get(id);
    return this.prisma.sizeGuide.update({
      where: { id },
      data: definedOnly(dto),
      select: SELECT,
    });
  }

  // Products using it simply stop showing a size guide (onDelete: SetNull).
  async remove(id: string) {
    await this.get(id);
    await this.prisma.sizeGuide.delete({ where: { id } });
    return { deleted: true };
  }
}
