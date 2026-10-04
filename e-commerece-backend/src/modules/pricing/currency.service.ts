import { Injectable } from '@nestjs/common';
import { money, type Money } from '../../common/money/money.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AUD_RATE,
  BASE_CURRENCY,
  convertAudCents,
  maxAudCentsFor,
  minAudCentsFor,
  type CurrencyRate,
} from './currency-math.js';

export class CurrencyContext {
  constructor(readonly rate: CurrencyRate) {}

  get code(): string {
    return this.rate.code;
  }

  convert(audCents: number): Money {
    return money(convertAudCents(audCents, this.rate), this.rate.code);
  }

  convertNullable(audCents: number | null | undefined): Money | null {
    return audCents == null ? null : this.convert(audCents);
  }

  // Shopper-entered price bounds (display currency) → AUD cents for queries.
  toAudBounds(min?: number, max?: number): { gte?: number; lte?: number } {
    return {
      gte: min == null ? undefined : minAudCentsFor(min, this.rate),
      lte: max == null ? undefined : maxAudCentsFor(max, this.rate),
    };
  }
}

export const AUD_CONTEXT = new CurrencyContext(AUD_RATE);

@Injectable()
export class CurrencyService {
  constructor(private readonly prisma: PrismaService) {}

  listEnabled() {
    return this.prisma.currency.findMany({
      where: { isEnabled: true },
      select: { code: true, symbol: true, isDefault: true },
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
    });
  }

  // Unknown or disabled currencies fall back to AUD.
  async resolve(code?: string | null): Promise<CurrencyContext> {
    const normalized = code?.trim().toUpperCase();
    if (!normalized || normalized === BASE_CURRENCY || !/^[A-Z]{3}$/.test(normalized)) {
      return AUD_CONTEXT;
    }
    const currency = await this.prisma.currency.findUnique({
      where: { code: normalized },
      select: { code: true, rateFromAud: true, roundTo: true, isEnabled: true },
    });
    if (!currency?.isEnabled) return AUD_CONTEXT;
    return new CurrencyContext({
      code: currency.code,
      rateFromAud: currency.rateFromAud.toFixed(6),
      roundTo: currency.roundTo,
    });
  }
}
