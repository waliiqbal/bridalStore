import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { money } from '../../common/money/money.js';
import { assertNoNulls, definedOnly } from '../../common/validation.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { pricingLines } from '../cart/cart-view.js';
import { CartService, type CartContext } from '../cart/cart.service.js';
import { shippingOptionsFor } from '../pricing/pricing.js';
import { PricingService } from '../pricing/pricing.service.js';
import type { CreateRateDto, CreateZoneDto, UpdateRateDto, UpdateZoneDto } from './dto/shipping.dto.js';

const RATE_SELECT = {
  id: true,
  name: true,
  price: true,
  freeOverAmount: true,
  estimatedDays: true,
  isActive: true,
  sortOrder: true,
} as const;

const ZONE_SELECT = {
  id: true,
  name: true,
  countryCodes: true,
  isFallback: true,
  chargesGst: true,
  rates: { select: RATE_SELECT, orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.ShippingZoneSelect;

type Tx = Prisma.TransactionClient;

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly carts: CartService,
  ) {}

  /**
   * Rates for the country's zone (fallback zone if none), converted, with
   * whether each is free for the shopper's current cart.
   */
  async options(cartCtx: CartContext, country: string, currencyCode?: string) {
    const row = await this.carts.loadCart(cartCtx);
    const ctx = await this.pricing.loadContext({
      currencyCode: currencyCode ?? row?.currencyCode,
      country,
      couponCode: row?.couponCode,
    });
    const priced = this.pricing.calculate(pricingLines(row), ctx);
    return {
      country: ctx.country,
      currencyCode: ctx.currency.code,
      available: ctx.zone !== null,
      zone: ctx.zone ? { id: ctx.zone.id, name: ctx.zone.name, chargesGst: ctx.zone.chargesGst } : null,
      options: shippingOptionsFor(ctx.zone?.rates ?? [], ctx.currency.rate, priced),
    };
  }

  // ── Admin: zones and rates (prices in AUD cents) ──

  async listZones() {
    const zones = await this.prisma.shippingZone.findMany({
      select: ZONE_SELECT,
      orderBy: [{ isFallback: 'asc' }, { name: 'asc' }],
    });
    return zones.map(zoneView);
  }

  async createZone(dto: CreateZoneDto) {
    const zone = await this.prisma.$transaction(async (tx) => {
      await this.assertZoneRules(tx, null, dto.countryCodes ?? [], dto.isFallback ?? false);
      return tx.shippingZone.create({
        data: {
          name: dto.name,
          countryCodes: dto.isFallback ? [] : (dto.countryCodes ?? []),
          isFallback: dto.isFallback ?? false,
          chargesGst: dto.chargesGst ?? false,
        },
        select: ZONE_SELECT,
      });
    });
    return zoneView(zone);
  }

  async updateZone(id: string, dto: UpdateZoneDto) {
    assertNoNulls(dto, ['name', 'countryCodes', 'isFallback', 'chargesGst']);
    const zone = await this.prisma.$transaction(async (tx) => {
      const current = await tx.shippingZone.findUnique({
        where: { id },
        select: { countryCodes: true, isFallback: true },
      });
      if (!current) throw new NotFoundException('Shipping zone not found');
      const isFallback = dto.isFallback ?? current.isFallback;
      const countryCodes = isFallback ? [] : (dto.countryCodes ?? current.countryCodes);
      await this.assertZoneRules(tx, id, countryCodes, isFallback);
      return tx.shippingZone.update({
        where: { id },
        data: definedOnly({ name: dto.name, chargesGst: dto.chargesGst, isFallback, countryCodes }),
        select: ZONE_SELECT,
      });
    });
    return zoneView(zone);
  }

  async removeZone(id: string) {
    const { count } = await this.prisma.shippingZone.deleteMany({ where: { id } });
    if (!count) throw new NotFoundException('Shipping zone not found');
    return { deleted: true };
  }

  async createRate(zoneId: string, dto: CreateRateDto) {
    await this.assertZone(zoneId);
    const rate = await this.prisma.shippingRate.create({
      data: { ...dto, zoneId },
      select: RATE_SELECT,
    });
    return rateView(rate);
  }

  async updateRate(zoneId: string, rateId: string, dto: UpdateRateDto) {
    assertNoNulls(dto, ['name', 'price', 'isActive', 'sortOrder']);
    const { count } = await this.prisma.shippingRate.updateMany({
      where: { id: rateId, zoneId },
      data: definedOnly(dto),
    });
    if (!count) throw new NotFoundException('Shipping rate not found');
    return rateView(await this.prisma.shippingRate.findUniqueOrThrow({ where: { id: rateId }, select: RATE_SELECT }));
  }

  async removeRate(zoneId: string, rateId: string) {
    const { count } = await this.prisma.shippingRate.deleteMany({ where: { id: rateId, zoneId } });
    if (!count) throw new NotFoundException('Shipping rate not found');
    return { deleted: true };
  }

  // A country can be in only one zone; there is at most one fallback zone.
  private async assertZoneRules(tx: Tx, zoneId: string | null, countryCodes: string[], isFallback: boolean) {
    const others = await tx.shippingZone.findMany({
      where: zoneId ? { id: { not: zoneId } } : {},
      select: { name: true, countryCodes: true, isFallback: true },
    });
    if (isFallback) {
      const fallback = others.find((z) => z.isFallback);
      if (fallback) {
        throw new ConflictException(`"${fallback.name}" is already the zone for all other countries`);
      }
      return;
    }
    if (!countryCodes.length) throw new BadRequestException('Add at least one country to this zone');
    for (const other of others) {
      const clash = countryCodes.filter((c) => other.countryCodes.includes(c));
      if (clash.length) {
        throw new ConflictException(`${clash.join(', ')} already in the "${other.name}" zone`);
      }
    }
  }

  private async assertZone(id: string) {
    const found = await this.prisma.shippingZone.count({ where: { id } });
    if (!found) throw new NotFoundException('Shipping zone not found');
  }
}

function rateView(rate: { price: number; freeOverAmount: number | null } & Record<string, unknown>) {
  return {
    ...rate,
    priceMoney: money(rate.price, 'AUD'),
    freeOver: rate.freeOverAmount === null ? null : money(rate.freeOverAmount, 'AUD'),
  };
}

function zoneView(zone: Prisma.ShippingZoneGetPayload<{ select: typeof ZONE_SELECT }>) {
  return { ...zone, rates: zone.rates.map(rateView) };
}
