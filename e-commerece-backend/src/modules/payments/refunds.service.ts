import { randomUUID } from 'node:crypto';
import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { OrderStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { canTransition } from '../orders/order-rules.js';
import { moneyText, refundableAmount } from './payment-rules.js';
import { PAYMENT_ADAPTERS, type PaymentAdapters, type ProviderRefundStatus, type RefundResult } from './providers/provider.js';

export const AUTO_REFUND = 'system:auto-refund';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_ADAPTERS) private readonly adapters: PaymentAdapters,
  ) {}

  /**
   * Refunds part or all of an order's payment. amount omitted = everything
   * still refundable. The amount is reserved (PENDING refund) under a row
   * lock first, so two refunds at once can never exceed what was paid.
   */
  async refund(
    orderId: string,
    input: { amount?: number; reason: string },
    createdBy: string,
    options: { paymentId?: string } = {},
  ) {
    const reserved = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "orderId" = ${orderId} FOR UPDATE`;
      const payments = await tx.payment.findMany({
        where: { orderId, status: { in: ['SUCCEEDED', 'REFUNDED'] }, ...(options.paymentId && { id: options.paymentId }) },
        select: {
          id: true,
          provider: true,
          amount: true,
          currencyCode: true,
          providerPaymentId: true,
          providerCaptureId: true,
          refunds: { select: { amount: true, status: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!payments.length) throw new BadRequestException('This order has no payment to refund');

      const target = payments
        .map((p) => ({ payment: p, remaining: refundableAmount(p.amount, p.refunds) }))
        .filter((t) => t.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining)[0];
      if (!target) throw new BadRequestException('This order has already been fully refunded');

      const amount = input.amount ?? target.remaining;
      if (!Number.isSafeInteger(amount) || amount < 1) throw new BadRequestException('Enter an amount to refund');
      if (amount > target.remaining) {
        throw new BadRequestException(
          `You can refund at most ${moneyText(target.remaining, target.payment.currencyCode)} (paid minus earlier refunds)`,
        );
      }

      const refund = await tx.refund.create({
        data: {
          paymentId: target.payment.id,
          amount,
          currencyCode: target.payment.currencyCode,
          reason: input.reason.trim(),
          createdBy,
          idempotencyKey: randomUUID(),
        },
        select: { id: true, idempotencyKey: true },
      });
      return { refund, payment: target.payment, amount };
    });

    const { refund, payment, amount } = reserved;
    const adapter = this.adapters[payment.provider];
    let result: RefundResult;
    try {
      if (!adapter || !payment.providerPaymentId) throw new Error(`${payment.provider} is not set up on this server`);
      result = await adapter.refund({
        providerPaymentId: payment.providerPaymentId,
        providerCaptureId: payment.providerCaptureId,
        amount,
        currencyCode: payment.currencyCode,
        idempotencyKey: refund.idempotencyKey,
        reason: input.reason,
      });
    } catch (error) {
      this.logger.error(`Refund ${refund.id} could not reach ${payment.provider}: ${error instanceof Error ? error.message : String(error)}`);
      result = { providerRefundId: null, status: 'FAILED', errorMessage: `Could not reach ${payment.provider}. Check its dashboard before trying again.` };
    }

    await this.prisma.refund.update({
      where: { id: refund.id },
      data: { status: result.status, providerRefundId: result.providerRefundId, errorMessage: result.errorMessage ?? null },
    });

    if (result.status === 'FAILED') {
      await this.flag(orderId, `Refund of ${moneyText(amount, payment.currencyCode)} failed: ${result.errorMessage ?? 'unknown reason'}`);
      throw new BadGatewayException(`The refund could not be completed: ${result.errorMessage ?? 'please try again'}`);
    }
    if (result.status === 'SUCCEEDED') await this.settled(refund.id);
    return this.view(refund.id);
  }

  /**
   * Refund status from a webhook. Idempotent: a repeated or out-of-date
   * update changes nothing. Returns what happened, for logging.
   */
  async applyProviderStatus(providerRefundId: string, status: ProviderRefundStatus): Promise<'updated' | 'unchanged' | 'unknown'> {
    const refund = await this.prisma.refund.findUnique({
      where: { providerRefundId },
      select: { id: true, status: true, amount: true, currencyCode: true, payment: { select: { orderId: true } } },
    });
    if (!refund) return 'unknown';
    // SUCCEEDED and FAILED are final
    if (refund.status !== 'PENDING' || status === 'PENDING') return 'unchanged';

    const { count } = await this.prisma.refund.updateMany({
      where: { id: refund.id, status: 'PENDING' },
      data: { status },
    });
    if (count !== 1) return 'unchanged';
    if (status === 'SUCCEEDED') await this.settled(refund.id);
    else await this.flag(refund.payment.orderId, `Refund of ${moneyText(refund.amount, refund.currencyCode)} failed at the provider`);
    return 'updated';
  }

  async flag(orderId: string, note: string) {
    await this.prisma.order.updateMany({ where: { id: orderId }, data: { attentionNote: note.slice(0, 1000) } });
    this.logger.warn(`Order ${orderId} flagged: ${note}`);
  }

  // A refund went through: update the payment, and the order if everything is refunded.
  private async settled(refundId: string) {
    await this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUniqueOrThrow({
        where: { id: refundId },
        select: { amount: true, currencyCode: true, reason: true, createdBy: true, paymentId: true, payment: { select: { orderId: true } } },
      });
      const orderId = refund.payment.orderId;
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: {
          status: true,
          payments: {
            where: { status: { in: ['SUCCEEDED', 'REFUNDED'] } },
            select: { id: true, amount: true, refunds: { where: { status: 'SUCCEEDED' }, select: { amount: true } } },
          },
        },
      });

      const refundedOf = (p: { refunds: { amount: number }[] }) => p.refunds.reduce((s, r) => s + r.amount, 0);
      const payment = order.payments.find((p) => p.id === refund.paymentId);
      if (payment && refundedOf(payment) >= payment.amount) {
        await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
      }

      const paid = order.payments.reduce((s, p) => s + p.amount, 0);
      const refunded = order.payments.reduce((s, p) => s + refundedOf(p), 0);
      const note = `Refunded ${moneyText(refund.amount, refund.currencyCode)}: ${refund.reason}`;
      const to: OrderStatus =
        refunded >= paid && canTransition(order.status, 'REFUNDED', 'payment') ? 'REFUNDED' : order.status;

      if (to !== order.status) {
        await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: to } });
      }
      await tx.orderStatusChange.create({
        data: { orderId, from: order.status, to, note, changedBy: refund.createdBy },
      });
    });
  }

  private async view(refundId: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      select: { id: true, amount: true, currencyCode: true, status: true, reason: true, providerRefundId: true, createdBy: true, createdAt: true },
    });
    if (!refund) throw new NotFoundException('Refund not found');
    return { ...refund, amount: { amount: refund.amount, currencyCode: refund.currencyCode } };
  }
}
