import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { normalizeEmail } from '../auth/customer/customer-auth.service.js';
import type { CustomerProfile } from '../auth/customer/customer-session.js';
import { buildCartView, pricingLines, type CartRow } from '../cart/cart-view.js';
import { CartService, type CartContext } from '../cart/cart.service.js';
import { OrderLifecycleService } from '../orders/order-lifecycle.service.js';
import { CHANGED_BY, formatOrderNumber, reservationExpiry } from '../orders/order-rules.js';
import { customerOrderView, ORDER_DETAIL_SELECT } from '../orders/order-view.js';
import { availabilityChanged, reserveStock } from '../orders/stock.js';
import { shippingOptionsFor, type PricingResult } from '../pricing/pricing.js';
import { PaymentConfigService } from '../payments/payment-config.service.js';
import { PricingService, type PricingContext } from '../pricing/pricing.service.js';
import type { CheckoutDto } from './dto/checkout.dto.js';

type Db = PrismaService | Prisma.TransactionClient;

export type ProblemCode =
  | 'EMPTY_CART'
  | 'LINE_LIMITED'
  | 'LINE_OUT_OF_STOCK'
  | 'LINE_UNAVAILABLE'
  | 'EMAIL_REQUIRED'
  | 'ADDRESS_REQUIRED'
  | 'ADDRESS_NOT_FOUND'
  | 'NO_SHIPPING_TO_COUNTRY'
  | 'SHIPPING_RATE_REQUIRED'
  | 'SHIPPING_RATE_NOT_AVAILABLE'
  | 'COUPON_INVALID';

export interface Problem {
  code: ProblemCode;
  message: string;
  lineId?: string;
}

interface AddressSnapshot {
  fullName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postcode: string;
  countryCode: string;
}

interface Prepared {
  cart: CartRow | null;
  pricingCtx: PricingContext;
  pricing: PricingResult;
  problems: Problem[];
  address: AddressSnapshot | null;
  email: string | null;
}

// Thrown inside the checkout transaction to roll it back with a 409.
class CheckoutProblems extends ConflictException {
  constructor(readonly problems: Problem[]) {
    super({ message: 'Please review your order', problems });
  }
}

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,100}$/;

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly carts: CartService,
    private readonly pricing: PricingService,
    private readonly lifecycle: OrderLifecycleService,
    private readonly paymentConfig: PaymentConfigService,
  ) {}

  /** Final breakdown and every problem, without creating anything. */
  async preview(ctx: CartContext, dto: CheckoutDto, customer?: CustomerProfile) {
    const prepared = await this.prepare(this.prisma, ctx, dto, customer);
    return this.previewView(prepared);
  }

  /**
   * Creates the order (PENDING_PAYMENT) and holds the stock for 30 minutes.
   * The same Idempotency-Key always returns the same order.
   */
  async checkout(
    ctx: CartContext,
    dto: CheckoutDto,
    idempotencyKey: string | undefined,
    customer?: CustomerProfile,
  ): Promise<{ created: boolean; body: Awaited<ReturnType<CheckoutService['orderResponse']>> }> {
    if (!idempotencyKey || !IDEMPOTENCY_KEY.test(idempotencyKey)) {
      throw new BadRequestException('Missing or invalid Idempotency-Key header (8–100 letters, numbers, - or _)');
    }

    const replay = await this.replay(ctx, idempotencyKey);
    if (replay) return { created: false, body: replay };

    let result: { orderId: string; changedProducts: string[] };
    try {
      result = await this.prisma.$transaction(
        async (tx) => {
          // 1. A newer checkout from the same bag replaces the older unpaid order
          const cartRef = await this.carts.loadCart(ctx, tx);
          const restocked: string[] = [];
          if (cartRef) {
            const pending = await tx.order.findMany({
              where: { cartId: cartRef.id, status: 'PENDING_PAYMENT' },
              select: { id: true },
            });
            for (const order of pending) {
              const cancelled = await this.lifecycle.cancel(
                tx,
                order.id,
                ['PENDING_PAYMENT'],
                CHANGED_BY.replacedByNewCheckout,
                'Replaced by a new checkout from the same bag.',
              );
              restocked.push(...cancelled.restockedProductIds);
            }
          }

          // 2. Re-validate and recalculate everything inside the transaction
          const prepared = await this.prepare(tx, ctx, dto, customer);
          if (prepared.problems.length) throw new CheckoutProblems(prepared.problems);
          const { cart, pricing, pricingCtx, address, email } = prepared;

          // 3. Reserve stock for every line at once (never below zero)
          const lines = pricing.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity }));
          const reserved = await reserveStock(tx, lines);
          if (!reserved.ok) {
            throw new CheckoutProblems([
              {
                code: 'LINE_OUT_OF_STOCK',
                message: 'Sorry, someone just bought the last of an item in your bag. Please review your bag.',
              },
            ]);
          }

          // 4. Reserve a coupon use (only while uses remain)
          const couponId = pricing.coupon?.valid ? pricing.coupon.id : null;
          if (couponId) {
            const taken = await tx.$executeRaw`
              UPDATE "Coupon" SET "usedCount" = "usedCount" + 1, "updatedAt" = now()
              WHERE "id" = ${couponId} AND "isActive" = true
                AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;
            if (taken !== 1) {
              throw new CheckoutProblems([
                { code: 'COUPON_INVALID', message: 'This code has just reached its usage limit.' },
              ]);
            }
          }

          // 5. The customer: signed in, or found/created by email (guest, no password)
          const customerId =
            customer?.id ??
            (
              await tx.customer.upsert({
                where: { email: email! },
                create: {
                  email: email!,
                  ...splitName(address!.fullName),
                  phone: dto.phone ?? address!.phone,
                  marketingOptIn: dto.marketingOptIn ?? false,
                },
                update: dto.marketingOptIn ? { marketingOptIn: true } : {},
                select: { id: true },
              })
            ).id;

          // 6. The order, with full snapshots
          const [{ value }] = await tx.$queryRaw<{ value: bigint }[]>`SELECT nextval('order_number_seq') AS value`;
          const view = buildCartView(cart, pricing, pricingCtx);
          const images = new Map(view.items.map((i) => [i.id, i.product.imageUrl]));
          const order = await tx.order.create({
            data: {
              orderNumber: formatOrderNumber(value),
              status: 'PENDING_PAYMENT',
              customerId,
              email: email!,
              phone: dto.phone ?? address!.phone,
              shipFullName: address!.fullName,
              shipLine1: address!.line1,
              shipLine2: address!.line2,
              shipCity: address!.city,
              shipState: address!.state,
              shipPostcode: address!.postcode,
              shipCountryCode: address!.countryCode,
              currencyCode: pricing.currencyCode,
              exchangeRate: pricingCtx.currency.rate.rateFromAud,
              subtotal: pricing.subtotal.amount,
              discountTotal: pricing.discount.amount,
              shippingTotal: pricing.shipping?.amount ?? 0,
              taxTotal: pricing.tax.amount?.amount ?? 0,
              total: pricing.total.amount,
              totalAud: pricing.totalAud.amount,
              couponCode: pricing.coupon?.valid ? pricing.coupon.code : null,
              couponId,
              cartId: cart!.id,
              idempotencyKey,
              reservationExpiresAt: reservationExpiry(),
              shippingMethod: pricing.shippingRate?.name ?? null,
              customerNote: dto.customerNote?.trim() || null,
              items: {
                createMany: {
                  data: cart!.items.map((item) => {
                    const line = pricing.lines.find((l) => l.id === item.id)!;
                    return {
                      variantId: item.variant.id,
                      productName: item.variant.product.name,
                      sku: item.variant.sku,
                      size: item.variant.size,
                      colour: item.variant.colour,
                      imageUrl: images.get(item.id) ?? null,
                      unitPrice: line.unitPrice.amount,
                      quantity: item.quantity,
                      lineTotal: line.lineTotal.amount,
                    };
                  }),
                },
              },
              statusHistory: {
                create: { from: null, to: 'PENDING_PAYMENT', changedBy: CHANGED_BY.customer },
              },
            },
            select: { id: true },
          });

          return {
            orderId: order.id,
            changedProducts: [...restocked, ...availabilityChanged(reserved.rows, lines, 'reserved')],
          };
        },
        { timeout: 20_000 },
      );
    } catch (error) {
      // Two identical requests at the same moment: the second one hits the unique key
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.replay(ctx, idempotencyKey);
        if (existing) return { created: false, body: existing };
      }
      throw error;
    }

    await this.lifecycle.notifyAvailability([...new Set(result.changedProducts)]);
    return { created: true, body: await this.orderResponse(result.orderId) };
  }

  private async replay(ctx: CartContext, idempotencyKey: string) {
    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey },
      select: { id: true, cartId: true },
    });
    if (!existing) return null;
    const cart = await this.carts.loadCart(ctx);
    if (existing.cartId && cart && existing.cartId !== cart.id) {
      throw new ConflictException('This checkout key was already used for a different bag');
    }
    return this.orderResponse(existing.id);
  }

  private async orderResponse(orderId: string) {
    const row = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: ORDER_DETAIL_SELECT });
    return {
      order: customerOrderView(row, this.paymentConfig.available()),
      paymentMethods: this.paymentConfig.methodsFor(row.currencyCode),
    };
  }

  private async prepare(db: Db, ctx: CartContext, dto: CheckoutDto, customer?: CustomerProfile): Promise<Prepared> {
    const problems: Problem[] = [];
    const cart = await this.carts.loadCart(ctx, db);

    let address: AddressSnapshot | null = null;
    if (dto.addressId) {
      const saved = customer
        ? await db.address.findFirst({
            where: { id: dto.addressId, customerId: customer.id },
            select: { fullName: true, phone: true, line1: true, line2: true, city: true, state: true, postcode: true, countryCode: true },
          })
        : null;
      if (saved) address = saved;
      else problems.push({ code: 'ADDRESS_NOT_FOUND', message: 'Please choose your shipping address again.' });
    } else if (dto.shippingAddress) {
      const a = dto.shippingAddress;
      address = {
        fullName: a.fullName.trim(),
        phone: a.phone ?? null,
        line1: a.line1.trim(),
        line2: a.line2?.trim() || null,
        city: a.city.trim(),
        state: a.state?.trim() || null,
        postcode: a.postcode.trim(),
        countryCode: a.countryCode,
      };
    } else {
      problems.push({ code: 'ADDRESS_REQUIRED', message: 'Please enter a shipping address.' });
    }

    const email = customer?.email ?? (dto.email ? normalizeEmail(dto.email) : null);
    if (!email) problems.push({ code: 'EMAIL_REQUIRED', message: 'Please enter your email address.' });

    const pricingCtx = await this.pricing.loadContext(
      {
        currencyCode: dto.currency ?? cart?.currencyCode,
        country: address?.countryCode,
        shippingRateId: dto.shippingRateId,
        couponCode: dto.couponCode === undefined ? cart?.couponCode : dto.couponCode,
      },
      db,
    );
    const pricing = this.pricing.calculate(pricingLines(cart), pricingCtx);

    if (!cart?.items.length) {
      problems.unshift({ code: 'EMPTY_CART', message: 'Your bag is empty.' });
    } else {
      for (const item of buildCartView(cart, pricing, pricingCtx).items) {
        if (item.status !== 'OK') {
          problems.push({ code: `LINE_${item.status}` as ProblemCode, message: `${item.product.name}: ${item.message}`, lineId: item.id });
        }
      }
    }

    if (address) {
      if (pricingCtx.shippingProblem === 'NO_SHIPPING_TO_COUNTRY') {
        problems.push({ code: 'NO_SHIPPING_TO_COUNTRY', message: "Sorry, we don't ship to this country yet." });
      } else if (pricingCtx.shippingProblem === 'RATE_NOT_AVAILABLE') {
        problems.push({ code: 'SHIPPING_RATE_NOT_AVAILABLE', message: 'Please choose a shipping option again.' });
      } else if (!dto.shippingRateId) {
        problems.push({ code: 'SHIPPING_RATE_REQUIRED', message: 'Please choose a shipping option.' });
      }
    }

    if (pricing.coupon && !pricing.coupon.valid) {
      problems.push({ code: 'COUPON_INVALID', message: pricing.coupon.message ?? 'This code is not valid.' });
    }

    return { cart, pricingCtx, pricing, problems, address, email };
  }

  private previewView({ cart, pricing, pricingCtx, problems }: Prepared) {
    return {
      ...buildCartView(cart, pricing, pricingCtx),
      problems,
      canPlaceOrder: problems.length === 0,
      // Only methods configured on this server
      paymentMethods: this.paymentConfig.methodsFor(pricing.currencyCode),
      // Choices for the shipping step, already priced for this bag
      shippingOptions: shippingOptionsFor(pricingCtx.zone?.rates ?? [], pricingCtx.currency.rate, pricing),
    };
  }
}

function splitName(fullName: string): { firstName: string | null; lastName: string | null } {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  return { firstName: first || null, lastName: rest.join(' ') || null };
}
