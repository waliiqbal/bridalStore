import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { money } from '../../common/money/money.js';
import { paginate, toSkipTake } from '../../common/pagination/pagination.js';
import { assertNoNulls, definedOnly } from '../../common/validation.js';
import type { CouponType, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CouponListQueryDto, CreateCouponDto, UpdateCouponDto } from './dto/pricing-admin.dto.js';

const SELECT = {
  id: true,
  code: true,
  type: true,
  value: true,
  minOrderAmount: true,
  maxUses: true,
  usedCount: true,
  startsAt: true,
  expiresAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CouponSelect;

type CouponRow = Prisma.CouponGetPayload<{ select: typeof SELECT }>;

// Plain-language state for the admin list.
export type CouponState = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'USED_UP' | 'INACTIVE';

export function couponState(c: CouponRow, now = new Date()): CouponState {
  if (!c.isActive) return 'INACTIVE';
  if (c.expiresAt && c.expiresAt <= now) return 'EXPIRED';
  if (c.maxUses !== null && c.usedCount >= c.maxUses) return 'USED_UP';
  if (c.startsAt && c.startsAt > now) return 'SCHEDULED';
  return 'ACTIVE';
}

@Injectable()
export class CouponsAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: CouponListQueryDto) {
    const where: Prisma.CouponWhereInput = query.q
      ? { code: { contains: query.q.trim(), mode: 'insensitive' } }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.coupon.findMany({ where, select: SELECT, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], ...toSkipTake(query) }),
      this.prisma.coupon.count({ where }),
    ]);
    return paginate(rows.map(toView), total, query);
  }

  async get(id: string) {
    const row = await this.prisma.coupon.findUnique({ where: { id }, select: SELECT });
    if (!row) throw new NotFoundException('Coupon not found');
    return toView(row);
  }

  async create(dto: CreateCouponDto) {
    validateCoupon({ ...dto, usedCount: 0 });
    const exists = await this.prisma.coupon.count({ where: { code: dto.code } });
    if (exists) throw new ConflictException(`The code ${dto.code} already exists`);
    const row = await this.prisma.coupon.create({
      data: { ...dto, value: dto.type === 'FREE_SHIPPING' ? 0 : dto.value },
      select: SELECT,
    });
    return toView(row);
  }

  async update(id: string, dto: UpdateCouponDto) {
    assertNoNulls(dto, ['code', 'type', 'value', 'isActive']);
    const current = await this.prisma.coupon.findUnique({ where: { id }, select: SELECT });
    if (!current) throw new NotFoundException('Coupon not found');
    const merged = { ...current, ...definedOnly(dto) };
    validateCoupon(merged);
    if (dto.code && dto.code !== current.code) {
      const taken = await this.prisma.coupon.count({ where: { code: dto.code, id: { not: id } } });
      if (taken) throw new ConflictException(`The code ${dto.code} already exists`);
    }
    const row = await this.prisma.coupon.update({
      where: { id },
      data: definedOnly({ ...dto, value: merged.type === 'FREE_SHIPPING' ? 0 : dto.value }),
      select: SELECT,
    });
    return toView(row);
  }

  // Used codes stay for the order history; they can be switched off instead.
  async remove(id: string) {
    const row = await this.prisma.coupon.findUnique({ where: { id }, select: { usedCount: true } });
    if (!row) throw new NotFoundException('Coupon not found');
    if (row.usedCount > 0) {
      throw new ConflictException('This code has been used in orders. Switch it off instead of deleting it.');
    }
    await this.prisma.coupon.delete({ where: { id } });
    return { deleted: true };
  }
}

function validateCoupon(c: {
  type: CouponType;
  value: number;
  maxUses?: number | null;
  usedCount: number;
  startsAt?: Date | null;
  expiresAt?: Date | null;
}) {
  if (c.type === 'PERCENTAGE' && (c.value < 1 || c.value > 100)) {
    throw new BadRequestException('A percentage discount must be between 1 and 100');
  }
  if (c.type === 'FIXED_AMOUNT' && c.value < 1) {
    throw new BadRequestException('Enter the discount amount (in AUD cents, e.g. 2000 for $20)');
  }
  if (c.startsAt && c.expiresAt && c.startsAt >= c.expiresAt) {
    throw new BadRequestException('The end date must be after the start date');
  }
  if (c.maxUses != null && c.maxUses < c.usedCount) {
    throw new BadRequestException(`This code has already been used ${c.usedCount} times`);
  }
}

function toView(row: CouponRow) {
  return {
    ...row,
    state: couponState(row),
    // FIXED_AMOUNT value and minimum order as money (AUD)
    amount: row.type === 'FIXED_AMOUNT' ? money(row.value, 'AUD') : null,
    minOrder: row.minOrderAmount === null ? null : money(row.minOrderAmount, 'AUD'),
  };
}
