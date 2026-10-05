import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { money } from '../../common/money/money.js';
import { Prisma, type PaymentProvider } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrderLifecycleService, type MarkPaidOutcome } from '../orders/order-lifecycle.service.js';
import { normalizeOrderNumber, STATUS_LABELS } from '../orders/order-rules.js';
import { customerOrderView, ORDER_DETAIL_SELECT } from '../orders/order-view.js';
import { PaymentConfigService } from './payment-config.service.js';
import { assertProviderAllowed, assertTwoDecimalCurrency, moneyText } from './payment-rules.js';
import {
  PAYMENT_ADAPTERS,
  type PaymentAdapters,
  type PaymentProviderAdapter,
  type ProviderPaymentState,
} from './providers/provider.js';
import { AUTO_REFUND, RefundsService } from './refunds.service.js';

// Who is paying: the browser's cart cookie and/or the signed-in customer.
export interface Payer {
  cartToken?: string;
  customerId?: string;
}

const ORDER_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  total: true,
  currencyCode: true,
  cartId: true,
  customerId: true,
  reservationExpiresAt: true,
} as const;

type PayableOrder = Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>;

// 402: the payment itself was declined; the shopper can try again.
class PaymentDeclined extends HttpException {
  constructor(message: string) {
    super({ message, paid: false }, HttpStatus.PAYMENT_REQUIRED);
  }
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_ADAPTERS) private readonly adapters: PaymentAdapters,
    private readonly config: PaymentConfigService,
    private readonly lifecycle: OrderLifecycleService,
    private readonly refunds: RefundsService,
  ) {}

  // ── Stripe: a PaymentIntent; the browser confirms it with the client secret ──
  async startStripe(orderNumber: string, payer: Payer) {
    const { order, adapter } = await this.payable(orderNumber, payer, 'STRIPE');
    const attempt = await this.newAttempt(order, 'STRIPE');
    const created = await adapter.createPayment(this.paymentInput(order, attempt.idempotencyKey));
    await this.attach(attempt.id, created.providerPaymentId);
    return {
      orderNumber: order.orderNumber,
      clientSecret: created.clientSecret,
      amount: money(order.total, order.currencyCode),
    };
  }

  // ── Square: card tokenized in the browser; we charge it here ──
  async paySquare(orderNumber: string, sourceId: string, verificationToken: string | undefined, payer: Payer) {
    const { order, adapter } = await this.payable(orderNumber, payer, 'SQUARE');
    const attempt = await this.newAttempt(order, 'SQUARE');
    const created = await adapter.createPayment({ ...this.paymentInput(order, attempt.idempotencyKey), sourceId, verificationToken });

    if (created.status === 'FAILED' || !created.providerPaymentId) {
      await this.failAttempt(attempt.id, created.errorMessage);
      throw new PaymentDeclined(created.errorMessage ?? 'The payment was not completed. Please try again.');
    }
    await this.attach(attempt.id, created.providerPaymentId);
    if (created.status === 'SUCCEEDED') {
      // Square's own API response — server-side proof of payment
      await this.settle(order.id, 'SQUARE', created.providerPaymentId, {
        status: 'SUCCEEDED',
        amount: created.amount ?? 0,
        currencyCode: created.currencyCode ?? order.currencyCode,
      });
    }
    return this.result(order.id);
  }

  // ── PayPal: create the PayPal order; the shopper approves it in the popup ──
  async startPayPal(orderNumber: string, payer: Payer) {
    const { order, adapter } = await this.payable(orderNumber, payer, 'PAYPAL');
    const attempt = await this.newAttempt(order, 'PAYPAL');
    const created = await adapter.createPayment(this.paymentInput(order, attempt.idempotencyKey));
    await this.attach(attempt.id, created.providerPaymentId);
    return { orderNumber: order.orderNumber, paypalOrderId: created.providerPaymentId };
  }

  // After approval: capture on the server (never trust the browser's "approved").
  async capturePayPal(orderNumber: string, paypalOrderId: string, payer: Payer) {
    const { order, adapter } = await this.payable(orderNumber, payer, 'PAYPAL');
    const attempt = await this.prisma.payment.findFirst({
      where: { orderId: order.id, provider: 'PAYPAL', providerPaymentId: paypalOrderId },
      select: { id: true, idempotencyKey: true },
    });
    if (!attempt) throw new NotFoundException('This PayPal payment does not belong to the order');
    const state = await adapter.capture!(paypalOrderId, `${attempt.idempotencyKey ?? attempt.id}-capture`);
    return this.applyState(order, 'PAYPAL', paypalOrderId, attempt.id, state);
  }

  /**
   * After the shopper returns from paying: ask the provider for the real
   * status of the latest attempt and mark the order paid if it is.
   */
  async confirm(orderNumber: string, payer: Payer) {
    const order = await this.owned(orderNumber, payer);
    if (order.status !== 'PENDING_PAYMENT') return this.result(order.id);

    const attempt = await this.prisma.payment.findFirst({
      where: { orderId: order.id, providerPaymentId: { not: null }, status: { in: ['PENDING', 'SUCCEEDED'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, provider: true, providerPaymentId: true, idempotencyKey: true },
    });
    const adapter = attempt ? this.adapters[attempt.provider] : undefined;
    if (!attempt || !adapter) return this.result(order.id);

    let state = await adapter.getStatus(attempt.providerPaymentId!);
    if (state.needsCapture && adapter.capture) {
      state = await adapter.capture(attempt.providerPaymentId!, `${attempt.idempotencyKey ?? attempt.id}-capture`);
    }
    return this.applyState(order, attempt.provider, attempt.providerPaymentId!, attempt.id, state);
  }

  publicConfig() {
    return this.config.publicConfig();
  }

  /**
   * Payment confirmed by the provider (API response, confirm or webhook).
   * markPaid is idempotent, so whichever path arrives first wins.
   */
  async settle(orderId: string, provider: PaymentProvider, providerPaymentId: string, state: ProviderPaymentState): Promise<MarkPaidOutcome> {
    const result = await this.lifecycle.markPaid(orderId, {
      provider,
      providerPaymentId,
      amount: state.amount,
      currencyCode: state.currencyCode,
      captureId: state.captureId ?? null,
    });
    await this.handleOutcome(orderId, provider, providerPaymentId, result.outcome, state);
    return result.outcome;
  }

  private async handleOutcome(
    orderId: string,
    provider: PaymentProvider,
    providerPaymentId: string,
    outcome: MarkPaidOutcome,
    state: ProviderPaymentState,
  ) {
    const paid = moneyText(state.amount, state.currencyCode);
    if (outcome === 'AMOUNT_MISMATCH') {
      await this.refunds.flag(
        orderId,
        `${provider} payment ${providerPaymentId} was ${paid}, which does not match the order. It was NOT marked as paid — check the payment in the ${provider} dashboard.`,
      );
    }
    if (outcome === 'NEEDS_REFUND') {
      const payment = await this.prisma.payment.findUnique({ where: { providerPaymentId }, select: { id: true } });
      try {
        if (!payment) throw new Error('payment record missing');
        await this.refunds.refund(orderId, { reason: 'Automatic refund: the order could not accept this payment' }, AUTO_REFUND, {
          paymentId: payment.id,
        });
        await this.refunds.flag(orderId, `A payment of ${paid} (${provider} ${providerPaymentId}) could not be used for this order and was refunded automatically.`);
      } catch (error) {
        this.logger.error(`Automatic refund for ${providerPaymentId} failed: ${error instanceof Error ? error.message : String(error)}`);
        await this.refunds.flag(orderId, `A payment of ${paid} (${provider} ${providerPaymentId}) must be refunded, but the automatic refund failed. Refund it manually.`);
      }
    }
  }

  private async applyState(order: PayableOrder, provider: PaymentProvider, providerPaymentId: string, attemptId: string, state: ProviderPaymentState) {
    if (state.status === 'SUCCEEDED') {
      await this.settle(order.id, provider, providerPaymentId, state);
    } else if (state.status === 'FAILED') {
      await this.failAttempt(attemptId, state.errorMessage);
      throw new PaymentDeclined(state.errorMessage ?? 'The payment was not completed. Please try again.');
    } else if (state.captureId) {
      await this.prisma.payment.update({ where: { id: attemptId }, data: { providerCaptureId: state.captureId } });
    }
    return this.result(order.id);
  }

  // Response for the shopper after any payment step.
  private async result(orderId: string) {
    const row = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: ORDER_DETAIL_SELECT });
    return {
      paid: row.status !== 'PENDING_PAYMENT' && row.status !== 'CANCELLED',
      status: row.status,
      statusLabel: STATUS_LABELS[row.status],
      order: customerOrderView(row, this.config.available()),
    };
  }

  // The order must belong to this browser/customer, be unpaid and still held.
  private async payable(orderNumber: string, payer: Payer, provider: PaymentProvider) {
    const order = await this.owned(orderNumber, payer);
    if (order.status !== 'PENDING_PAYMENT') {
      throw new ConflictException(
        order.status === 'CANCELLED'
          ? 'This order was cancelled because payment was not received in time. Please check out again.'
          : `This order is already paid (${STATUS_LABELS[order.status]}).`,
      );
    }
    if (order.reservationExpiresAt && order.reservationExpiresAt <= new Date()) {
      throw new ConflictException('The 30 minutes to pay for this order have passed. Please check out again.');
    }
    assertProviderAllowed(provider, order.currencyCode, this.config.available());
    assertTwoDecimalCurrency(order.currencyCode);
    return { order, adapter: this.adapters[provider] as PaymentProviderAdapter };
  }

  // Same 404 whether the order doesn't exist or isn't this shopper's.
  private async owned(orderNumber: string, payer: Payer): Promise<PayableOrder> {
    const number = normalizeOrderNumber(orderNumber);
    const order = number ? await this.prisma.order.findUnique({ where: { orderNumber: number }, select: ORDER_SELECT }) : null;
    if (order) {
      if (payer.customerId && order.customerId === payer.customerId) return order;
      if (payer.cartToken && order.cartId) {
        const cart = await this.prisma.cart.findUnique({ where: { token: payer.cartToken }, select: { id: true } });
        if (cart?.id === order.cartId) return order;
      }
    }
    throw new NotFoundException('Order not found');
  }

  // Each attempt gets its own Payment row and idempotency key (amount from the Order).
  private newAttempt(order: PayableOrder, provider: PaymentProvider) {
    return this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider,
        amount: order.total,
        currencyCode: order.currencyCode,
        idempotencyKey: randomUUID(),
      },
      select: { id: true, idempotencyKey: true },
    }) as Promise<{ id: string; idempotencyKey: string }>;
  }

  private paymentInput(order: PayableOrder, idempotencyKey: string) {
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total,
      currencyCode: order.currencyCode,
      idempotencyKey,
    };
  }

  // Link the attempt to the provider's ID. If a webhook already created the
  // row for this provider ID (it was faster), the placeholder attempt goes.
  private async attach(attemptId: string, providerPaymentId: string | null) {
    if (!providerPaymentId) return;
    try {
      await this.prisma.payment.update({ where: { id: attemptId }, data: { providerPaymentId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        await this.prisma.payment.delete({ where: { id: attemptId } });
        return;
      }
      throw error;
    }
  }

  private failAttempt(attemptId: string, errorMessage?: string) {
    return this.prisma.payment.updateMany({
      where: { id: attemptId, status: 'PENDING' },
      data: { status: 'FAILED', errorMessage: errorMessage?.slice(0, 500) ?? null },
    });
  }
}
