import { Injectable } from '@nestjs/common';
import { isCountryCode } from '../../common/countries.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CurrencyService, type CurrencyContext } from './currency.service.js';
import {
  calculatePricing,
  zoneForCountry,
  type PricingCoupon,
  type PricingLineInput,
  type PricingRate,
  type PricingResult,
  type PricingZone,
} from './pricing.js';

export interface PricingRequest {
  currencyCode?: string | null;
  // ISO 2-letter; null/undefined = not known yet
  country?: string | null;
  shippingRateId?: string | null;
  couponCode?: string | null;
  // No rate chosen: estimate with the cheapest rate of the zone (cart page)
  estimateShipping?: boolean;
}

export type ShippingProblem = 'NO_SHIPPING_TO_COUNTRY' | 'RATE_NOT_AVAILABLE' | null;

export interface PricingContext {
  currency: CurrencyContext;
  gstRatePercent: string;
  removeGstForExports: boolean;
  country: string | null;
  zone: (PricingZone & { rates: PricingRate[] }) | null;
  shippingRate: PricingRate | null;
  shippingIsEstimate: boolean;
  shippingProblem: ShippingProblem;
  couponCode: string | null;
  coupon: PricingCoupon | null;
}

const COUPON_SELECT = {
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
} as const;

export const normalizeCouponCode = (code: string) => code.trim().toUpperCase();

/**
 * Loads what a calculation needs (currency, GST settings, zone + rates,
 * coupon) in parallel — a fixed number of queries — then hands everything
 * to the pure calculatePricing().
 */
@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencies: CurrencyService,
  ) {}

  // Pass the transaction client when pricing inside a transaction (checkout),
  // so changes made earlier in it (e.g. a coupon use given back) are seen.
  async loadContext(
    request: PricingRequest,
    db: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<PricingContext> {
    const country = request.country && isCountryCode(request.country.toUpperCase())
      ? request.country.toUpperCase()
      : null;
    const couponCode = request.couponCode ? normalizeCouponCode(request.couponCode) : null;

    const [currency, settings, zones, coupon] = await Promise.all([
      this.currencies.resolve(request.currencyCode),
      db.storeSettings.findUnique({
        where: { id: 1 },
        select: { gstRatePercent: true, removeGstForExports: true },
      }),
      country
        ? db.shippingZone.findMany({
            where: { OR: [{ countryCodes: { has: country } }, { isFallback: true }] },
            select: {
              id: true,
              name: true,
              chargesGst: true,
              countryCodes: true,
              isFallback: true,
              rates: {
                where: { isActive: true },
                select: { id: true, name: true, price: true, freeOverAmount: true, estimatedDays: true },
                orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }, { id: 'asc' }],
              },
            },
          })
        : [],
      couponCode ? db.coupon.findUnique({ where: { code: couponCode }, select: COUPON_SELECT }) : null,
    ]);

    const zoneRow = country ? zoneForCountry(zones, country) : null;
    const zone = zoneRow
      ? { id: zoneRow.id, name: zoneRow.name, chargesGst: zoneRow.chargesGst, rates: zoneRow.rates }
      : null;

    let shippingRate: PricingRate | null = null;
    let shippingIsEstimate = false;
    let shippingProblem: ShippingProblem = null;
    if (country && !zone) {
      shippingProblem = 'NO_SHIPPING_TO_COUNTRY';
    } else if (zone && request.shippingRateId) {
      shippingRate = zone.rates.find((r) => r.id === request.shippingRateId) ?? null;
      if (!shippingRate) shippingProblem = 'RATE_NOT_AVAILABLE';
    } else if (zone && request.estimateShipping) {
      shippingRate = [...zone.rates].sort((a, b) => a.price - b.price)[0] ?? null;
      shippingIsEstimate = shippingRate !== null;
      if (!shippingRate) shippingProblem = 'RATE_NOT_AVAILABLE';
    }

    return {
      currency,
      gstRatePercent: settings ? settings.gstRatePercent.toFixed(2) : '10.00',
      removeGstForExports: settings?.removeGstForExports ?? false,
      country,
      zone,
      shippingRate,
      shippingIsEstimate,
      shippingProblem,
      couponCode,
      coupon,
    };
  }

  calculate(lines: PricingLineInput[], ctx: PricingContext, now = new Date()): PricingResult {
    return calculatePricing({
      lines,
      currency: ctx.currency.rate,
      gstRatePercent: ctx.gstRatePercent,
      removeGstForExports: ctx.removeGstForExports,
      zone: ctx.zone,
      shippingRate: ctx.shippingRate,
      couponCode: ctx.couponCode,
      coupon: ctx.coupon,
      now,
    });
  }
}
