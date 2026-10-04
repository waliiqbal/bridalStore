import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { OrderStatus, PaymentProvider, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CacheTags, RevalidationService } from '../revalidation/revalidation.service.js';
import {
  canTransition,
  CHANGED_BY,
  STATUS_LABELS,
} from './order-rules.js';
import {
  addSales,
  availabilityChanged,
  releaseStock,
  reserveStock,
  type StockLine,
  type StockRow,
} from './stock.js';

type Tx = Prisma.TransactionClient;

export interface PaymentInfo {
  provider: PaymentProvider;
  providerPaymentId: string;
  // Cents in the order currency
  amount: number;
  currencyCode: string;
  rawResponse?: Prisma.InputJsonValue;
}

/**
 * PAID: order moved to PROCESSING.
 * ALREADY_PAID: the same payment was already recorded (webhook delivered twice).
 * NEEDS_REFUND: money received but the order can't be fulfilled (cancelled and
 *   stock gone, or a second payment for a paid order) — phase 6 refunds it.
 * AMOUNT_MISMATCH: amount/currency differ from the order; not marked paid.
 */
export type MarkPaidOutcome = 'PAID' | 'ALREADY_PAID' | 'NEEDS_REFUND' | 'AMOUNT_MISMATCH';

const ORDER_STOCK_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  total: true,
  currencyCode: true,
  cartId: true,
  couponId: true,
  items: { select: { variantId: true, quantity: true, variant: { select: { productId: true } } } },
} satisfies Prisma.OrderSelect;

type OrderForStock = Prisma.OrderGetPayload<{ select: typeof ORDER_STOCK_SELECT }>;

const stockLines = (order: OrderForStock): StockLine[] =>
  order.items.filter((i) => i.variantId).map((i) => ({ variantId: i.variantId!, quantity: i.quantity }));

@Injectable()
export class OrderLifecycleService {
  private readonly logger = new Logger(OrderLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  /**
   * Called by payment webhooks (phase 6). Safe to call any number of times
   * with the same payment: only the first call changes anything.
   */
  async markPaid(orderId: string, payment: PaymentInfo): Promise<{ outcome: MarkPaidOutcome; orderNumber: string }> {
    const changed: StockRow[] = [];
    const reserved: StockLine[] = [];

    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, select: ORDER_STOCK_SELECT });
      if (!order) throw new NotFoundException('Order not found');
      const done = (outcome: MarkPaidOutcome) => ({ outcome, orderNumber: order.orderNumber });

      const existing = await tx.payment.findUnique({
        where: { providerPaymentId: payment.providerPaymentId },
        select: { status: true, orderId: true },
      });
      if (existing?.status === 'SUCCEEDED') return done('ALREADY_PAID');

      if (payment.amount !== order.total || payment.currencyCode !== order.currencyCode) {
        await this.recordPayment(tx, order.id, payment, 'FAILED', `Expected ${order.total} ${order.currencyCode}`);
        this.logger.warn(
          `Order ${order.orderNumber}: payment ${payment.providerPaymentId} was ${payment.amount} ${payment.currencyCode}, expected ${order.total} ${order.currencyCode}`,
        );
        return done('AMOUNT_MISMATCH');
      }

      await this.recordPayment(tx, order.id, payment, 'SUCCEEDED');
      const by = CHANGED_BY.payment(payment.provider);

      if (order.status === 'PENDING_PAYMENT') {
        const { count } = await tx.order.updateMany({
          where: { id: order.id, status: 'PENDING_PAYMENT' },
          data: { status: 'PROCESSING', placedAt: new Date(), reservationExpiresAt: null },
        });
        if (count !== 1) return done('ALREADY_PAID');
        await this.fulfilPaid(tx, order, by, 'PENDING_PAYMENT', null);
        return done('PAID');
      }

      if (order.status === 'CANCELLED' && (await this.cancelledByExpiry(tx, order.id))) {
        // Late payment: revive the order if the stock is still there.
        const lines = stockLines(order);
        const attempt = await reserveStock(tx, lines);
        if (attempt.ok) {
          changed.push(...attempt.rows);
          reserved.push(...lines);
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'PROCESSING', placedAt: new Date() },
          });
          if (order.couponId) {
            await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });
          }
          await this.fulfilPaid(tx, order, by, 'CANCELLED', 'Payment arrived after the 30-minute hold ended; the items were still in stock.');
          return done('PAID');
        }
        throw new NeedsRefund(order.id, 'Payment arrived after the order was cancelled and the items are no longer in stock. Refund needed.');
      }

      // Cancelled by the owner, or a second payment for a paid order
      throw new NeedsRefund(
        order.id,
        order.status === 'CANCELLED'
          ? 'Payment arrived for a cancelled order. Refund needed.'
          : `A second payment was received for this order (${STATUS_LABELS[order.status]}). Refund needed.`,
      );
    }).catch(async (error: unknown) => {
      if (!(error instanceof NeedsRefund)) throw error;
      // Recorded outside the rolled-back transaction so the money is never lost track of
      const order = await this.prisma.order.findUniqueOrThrow({
        where: { id: error.orderId },
        select: { status: true, orderNumber: true },
      });
      await this.prisma.$transaction(async (tx) => {
        await this.recordPayment(tx, error.orderId, payment, 'SUCCEEDED');
        await tx.orderStatusChange.create({
          data: { orderId: error.orderId, from: order.status, to: order.status, note: error.message, changedBy: CHANGED_BY.payment(payment.provider) },
        });
      });
      this.logger.warn(`Order ${order.orderNumber}: ${error.message}`);
      return { outcome: 'NEEDS_REFUND' as const, orderNumber: order.orderNumber };
    });

    if (changed.length) await this.notifyAvailability(availabilityChanged(changed, reserved, 'reserved'));
    return result;
  }

  /**
   * Cancels unpaid orders whose 30-minute hold has passed and returns their
   * stock and coupon uses. Idempotent: each order is cancelled at most once.
   */
  async releaseExpiredReservations(now = new Date(), limit = 100): Promise<{ cancelled: number; orderNumbers: string[] }> {
    const expired = await this.prisma.order.findMany({
      where: { status: 'PENDING_PAYMENT', reservationExpiresAt: { lt: now } },
      select: { id: true, orderNumber: true },
      orderBy: { reservationExpiresAt: 'asc' },
      take: limit,
    });
    const orderNumbers: string[] = [];
    const productIds = new Set<string>();
    for (const order of expired) {
      const result = await this.prisma.$transaction((tx) =>
        this.cancel(tx, order.id, ['PENDING_PAYMENT'], CHANGED_BY.reservationExpired, 'Payment was not received within 30 minutes.'),
      );
      if (result.cancelled) {
        orderNumbers.push(order.orderNumber);
        result.restockedProductIds.forEach((id) => productIds.add(id));
      }
    }
    await this.notifyAvailability([...productIds]);
    return { cancelled: orderNumbers.length, orderNumbers };
  }

  /**
   * Cancels an order inside the caller's transaction: returns stock (it was
   * never shipped) and the coupon use. cancelled is false if the order wasn't
   * in one of `from` (already handled by someone else). restockedProductIds:
   * products that came back into stock — notify them after the commit.
   */
  async cancel(
    tx: Tx,
    orderId: string,
    from: OrderStatus[],
    changedBy: string,
    note: string | null,
  ): Promise<{ cancelled: boolean; restockedProductIds: string[] }> {
    const none = { cancelled: false, restockedProductIds: [] };
    const order = await tx.order.findUnique({ where: { id: orderId }, select: ORDER_STOCK_SELECT });
    if (!order || !from.includes(order.status)) return none;

    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: 'CANCELLED', reservationExpiresAt: null },
    });
    if (count !== 1) return none;

    const lines = stockLines(order);
    const rows = await releaseStock(tx, lines);
    if (order.couponId) {
      await tx.coupon.updateMany({
        where: { id: order.couponId, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }
    await tx.orderStatusChange.create({
      data: { orderId, from: order.status, to: 'CANCELLED', note, changedBy },
    });
    return { cancelled: true, restockedProductIds: availabilityChanged(rows, lines, 'released') };
  }

  /**
   * Admin status change. SHIPPED needs a tracking number; CANCELLED returns
   * stock and reports whether a refund is needed (the order was paid).
   */
  async changeStatus(
    orderId: string,
    to: OrderStatus,
    changedBy: string,
    details: { note?: string | null; trackingNumber?: string | null; trackingUrl?: string | null },
  ): Promise<{ refundRequired: boolean }> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (!canTransition(order.status, to, 'admin')) {
      throw new BadRequestException(
        `An order that is "${STATUS_LABELS[order.status]}" can't be changed to "${STATUS_LABELS[to]}"`,
      );
    }
    if (to === 'SHIPPED' && !details.trackingNumber?.trim()) {
      throw new BadRequestException('Please add the tracking number before marking the order as shipped');
    }

    if (to === 'CANCELLED') {
      const result = await this.prisma.$transaction((tx) =>
        this.cancel(tx, orderId, [order.status], changedBy, details.note ?? null),
      );
      if (!result.cancelled) throw new BadRequestException('This order was just updated by someone else. Please refresh.');
      await this.notifyAvailability(result.restockedProductIds);
      return { refundRequired: order.status === 'PROCESSING' };
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id: orderId, status: order.status },
        data:
          to === 'SHIPPED'
            ? { status: to, shippedAt: now, trackingNumber: details.trackingNumber!.trim(), trackingUrl: details.trackingUrl ?? null }
            : { status: to, deliveredAt: now },
      });
      if (count !== 1) throw new BadRequestException('This order was just updated by someone else. Please refresh.');
      await tx.orderStatusChange.create({
        data: { orderId, from: order.status, to, note: details.note ?? null, changedBy },
      });
    });
    return { refundRequired: false };
  }

  private async fulfilPaid(tx: Tx, order: OrderForStock, changedBy: string, from: OrderStatus, note: string | null) {
    await addSales(
      tx,
      order.items.filter((i) => i.variant).map((i) => ({ productId: i.variant!.productId, quantity: i.quantity })),
    );
    // Take the bought items out of the bag (anything added since stays)
    if (order.cartId) {
      const variantIds = order.items.map((i) => i.variantId).filter((id): id is string => !!id);
      await tx.cartItem.deleteMany({ where: { cartId: order.cartId, variantId: { in: variantIds } } });
      await tx.cart.update({ where: { id: order.cartId }, data: { couponCode: null } });
    }
    await tx.orderStatusChange.create({
      data: { orderId: order.id, from, to: 'PROCESSING', note, changedBy },
    });
  }

  private async cancelledByExpiry(tx: Tx, orderId: string): Promise<boolean> {
    const last = await tx.orderStatusChange.findFirst({
      where: { orderId, to: 'CANCELLED' },
      orderBy: { createdAt: 'desc' },
      select: { changedBy: true },
    });
    return last?.changedBy === CHANGED_BY.reservationExpired;
  }

  private recordPayment(tx: Tx, orderId: string, payment: PaymentInfo, status: 'SUCCEEDED' | 'FAILED', errorMessage?: string) {
    return tx.payment.upsert({
      where: { providerPaymentId: payment.providerPaymentId },
      create: {
        orderId,
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        amount: payment.amount,
        currencyCode: payment.currencyCode,
        status,
        rawResponse: payment.rawResponse,
        errorMessage: errorMessage ?? null,
      },
      update: { status, errorMessage: errorMessage ?? null },
    });
  }

  // Stock changes only refresh pages for products that sold out or came back.
  async notifyAvailability(productIds: string[]): Promise<void> {
    if (!productIds.length) return;
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { slug: true },
    });
    void this.revalidation.notify([...products.map((p) => CacheTags.product(p.slug)), CacheTags.products]);
  }
}

// Thrown to roll back the markPaid transaction when a refund is needed.
class NeedsRefund extends Error {
  constructor(
    readonly orderId: string,
    message: string,
  ) {
    super(message);
  }
}
