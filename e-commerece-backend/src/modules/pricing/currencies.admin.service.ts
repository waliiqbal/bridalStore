import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { assertNoNulls, definedOnly } from '../../common/validation.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CacheTags, RevalidationService } from '../revalidation/revalidation.service.js';
import { BASE_CURRENCY, rateToMicros } from './currency-math.js';
import type { CreateCurrencyDto, UpdateCurrencyDto } from './dto/pricing-admin.dto.js';

const SELECT = {
  code: true,
  symbol: true,
  rateFromAud: true,
  roundTo: true,
  isEnabled: true,
  isDefault: true,
  updatedAt: true,
} as const;

@Injectable()
export class CurrenciesAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  async list() {
    const rows = await this.prisma.currency.findMany({
      select: SELECT,
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
    });
    return rows.map(toView);
  }

  async create(dto: CreateCurrencyDto) {
    assertRate(dto.rateFromAud);
    const exists = await this.prisma.currency.count({ where: { code: dto.code } });
    if (exists) throw new ConflictException(`${dto.code} already exists`);
    const row = await this.prisma.currency.create({
      data: { ...dto, isDefault: false },
      select: SELECT,
    });
    this.notify();
    return toView(row);
  }

  async update(code: string, dto: UpdateCurrencyDto) {
    assertNoNulls(dto, ['symbol', 'rateFromAud', 'roundTo', 'isEnabled']);
    const upper = code.toUpperCase();
    if (dto.code !== undefined && dto.code !== upper) {
      throw new BadRequestException("A currency's code can't be changed");
    }
    if (upper === BASE_CURRENCY) {
      if (dto.rateFromAud !== undefined && rateToMicros(dto.rateFromAud) !== 1_000_000n) {
        throw new BadRequestException('AUD is the base currency; its rate is always 1');
      }
      if (dto.isEnabled === false) throw new BadRequestException("AUD can't be disabled");
      if (dto.roundTo !== undefined && dto.roundTo !== 1) {
        throw new BadRequestException('AUD prices are never rounded');
      }
    }
    if (dto.rateFromAud !== undefined) assertRate(dto.rateFromAud);

    const { count } = await this.prisma.currency.updateMany({
      where: { code: upper },
      data: definedOnly({ symbol: dto.symbol, rateFromAud: dto.rateFromAud, roundTo: dto.roundTo, isEnabled: dto.isEnabled }),
    });
    if (!count) throw new NotFoundException('Currency not found');
    this.notify();
    return toView(await this.prisma.currency.findUniqueOrThrow({ where: { code: upper }, select: SELECT }));
  }

  // Past orders keep their own currency snapshot, so deleting is safe.
  async remove(code: string) {
    const upper = code.toUpperCase();
    if (upper === BASE_CURRENCY) throw new BadRequestException("AUD can't be deleted");
    const { count } = await this.prisma.currency.deleteMany({ where: { code: upper } });
    if (!count) throw new NotFoundException('Currency not found');
    this.notify();
    return { deleted: true };
  }

  // Converted prices appear on every listing and product page.
  private notify() {
    void this.revalidation.notify([CacheTags.currencies, CacheTags.products]);
  }
}

function assertRate(rate: string) {
  if (rateToMicros(rate) <= 0n) throw new BadRequestException('Exchange rate must be more than 0');
}

function toView(row: { rateFromAud: { toFixed(digits: number): string } } & Record<string, unknown>) {
  return { ...row, rateFromAud: row.rateFromAud.toFixed(6) };
}
