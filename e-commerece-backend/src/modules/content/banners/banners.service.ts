import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { assertNoNulls, definedOnly } from '../../../common/validation.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CacheTags, RevalidationService } from '../../revalidation/revalidation.service.js';
import { liveBannerWhere, validateBannerWindow } from './banner-window.js';
import type { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto.js';

const PUBLIC_SELECT = {
  id: true,
  title: true,
  subtitle: true,
  imageUrl: true,
  mobileImageUrl: true,
  linkUrl: true,
  buttonText: true,
  placement: true,
} as const;

@Injectable()
export class BannersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  listPublic(placement?: string) {
    return this.prisma.banner.findMany({
      where: { ...liveBannerWhere(new Date()), ...(placement && { placement }) },
      select: PUBLIC_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  listAdmin(placement?: string) {
    return this.prisma.banner.findMany({
      where: placement ? { placement } : {},
      orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async get(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return banner;
  }

  async create(dto: CreateBannerDto) {
    this.assertWindow(dto.startsAt ?? null, dto.endsAt ?? null);
    const placement = dto.placement ?? 'home_hero';
    const last = await this.prisma.banner.aggregate({
      where: { placement },
      _max: { sortOrder: true },
    });
    const banner = await this.prisma.banner.create({
      data: { ...dto, placement, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
    this.notify();
    return banner;
  }

  async update(id: string, dto: UpdateBannerDto) {
    assertNoNulls(dto, ['imageUrl', 'placement', 'isActive']);
    const current = await this.get(id);
    this.assertWindow(
      dto.startsAt === undefined ? current.startsAt : dto.startsAt,
      dto.endsAt === undefined ? current.endsAt : dto.endsAt,
    );
    const banner = await this.prisma.banner.update({ where: { id }, data: definedOnly(dto) });
    this.notify();
    return banner;
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.banner.delete({ where: { id } });
    this.notify();
    return { deleted: true };
  }

  async reorder(ids: string[]) {
    const found = await this.prisma.banner.count({ where: { id: { in: ids } } });
    if (found !== ids.length) throw new BadRequestException('One or more banners no longer exist');
    await this.prisma.$transaction(
      ids.map((id, sortOrder) => this.prisma.banner.update({ where: { id }, data: { sortOrder } })),
    );
    this.notify();
    return { reordered: ids.length };
  }

  private assertWindow(startsAt: Date | null, endsAt: Date | null) {
    const error = validateBannerWindow(startsAt, endsAt);
    if (error) throw new BadRequestException(error);
  }

  private notify() {
    void this.revalidation.notify([CacheTags.banners]);
  }
}
