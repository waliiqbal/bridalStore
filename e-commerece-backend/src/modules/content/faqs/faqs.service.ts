import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { assertNoNulls, definedOnly } from '../../../common/validation.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CacheTags, RevalidationService } from '../../revalidation/revalidation.service.js';
import type { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto.js';

const ORDER = [{ sortOrder: 'asc' as const }, { id: 'asc' as const }];

@Injectable()
export class FaqsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  listPublic() {
    return this.prisma.faq.findMany({
      where: { isActive: true },
      select: { id: true, question: true, answer: true },
      orderBy: ORDER,
    });
  }

  listAdmin() {
    return this.prisma.faq.findMany({ orderBy: ORDER });
  }

  async create(dto: CreateFaqDto) {
    const last = await this.prisma.faq.aggregate({ _max: { sortOrder: true } });
    const faq = await this.prisma.faq.create({
      data: { ...dto, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
    this.notify();
    return faq;
  }

  async update(id: string, dto: UpdateFaqDto) {
    assertNoNulls(dto, ['question', 'answer', 'isActive']);
    await this.assertExists(id);
    const faq = await this.prisma.faq.update({ where: { id }, data: definedOnly(dto) });
    this.notify();
    return faq;
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.faq.delete({ where: { id } });
    this.notify();
    return { deleted: true };
  }

  async reorder(ids: string[]) {
    const found = await this.prisma.faq.count({ where: { id: { in: ids } } });
    if (found !== ids.length) throw new BadRequestException('One or more questions no longer exist');
    await this.prisma.$transaction(
      ids.map((id, sortOrder) => this.prisma.faq.update({ where: { id }, data: { sortOrder } })),
    );
    this.notify();
    return { reordered: ids.length };
  }

  private async assertExists(id: string) {
    const found = await this.prisma.faq.count({ where: { id } });
    if (!found) throw new NotFoundException('Question not found');
  }

  // Pages with an FAQ section also subscribe to "faqs"
  private notify() {
    void this.revalidation.notify([CacheTags.faqs]);
  }
}
