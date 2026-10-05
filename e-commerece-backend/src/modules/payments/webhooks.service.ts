import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, type PaymentProvider } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PaymentsService } from './payments.service.js';
import {
  InvalidWebhookSignatureError,
  PAYMENT_ADAPTERS,
  type PaymentAdapters,
  type WebhookHeaders,
  type WebhookOutcome,
} from './providers/provider.js';
import { RefundsService } from './refunds.service.js';

/**
 * Verifies, de-duplicates and applies provider webhooks. Every event is
 * recorded in WebhookEvent; a repeated delivery of a processed event is
 * acknowledged and ignored. A failed event returns 500 so the provider retries.
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger('Webhooks');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_ADAPTERS) private readonly adapters: PaymentAdapters,
    private readonly payments: PaymentsService,
    private readonly refunds: RefundsService,
  ) {}

  async handle(provider: PaymentProvider, rawBody: Buffer | undefined, headers: WebhookHeaders) {
    const adapter = this.adapters[provider];
    if (!adapter) throw new NotFoundException(`${provider} payments are not set up on this server`);
    if (!rawBody?.length) throw new BadRequestException('Empty webhook body');

    let outcome: WebhookOutcome;
    try {
      outcome = await adapter.verifyAndParseWebhook(rawBody, headers);
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        this.logger.warn(`${provider} webhook rejected: ${error.message}`);
        throw new BadRequestException('Invalid webhook signature');
      }
      throw error;
    }
    if (!outcome.eventId) throw new BadRequestException('Webhook has no event id');

    // Record first: a duplicate delivery of a processed event stops here.
    try {
      await this.prisma.webhookEvent.create({ data: { provider, eventId: outcome.eventId, type: outcome.type } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
      const existing = await this.prisma.webhookEvent.findUniqueOrThrow({
        where: { provider_eventId: { provider, eventId: outcome.eventId } },
        select: { processedAt: true },
      });
      if (existing.processedAt) return { received: true, duplicate: true };
      // An earlier attempt failed — process again (everything below is idempotent)
    }

    try {
      await this.process(provider, outcome);
      await this.prisma.webhookEvent.update({
        where: { provider_eventId: { provider, eventId: outcome.eventId } },
        data: { processedAt: new Date(), error: null },
      });
      return { received: true, duplicate: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`${provider} webhook ${outcome.eventId} (${outcome.type}) failed: ${message}`);
      await this.prisma.webhookEvent.update({
        where: { provider_eventId: { provider, eventId: outcome.eventId } },
        data: { error: message.slice(0, 1000) },
      });
      throw error;
    }
  }

  private async process(provider: PaymentProvider, outcome: WebhookOutcome) {
    switch (outcome.kind) {
      case 'payment': {
        const orderId = await this.findOrderId(provider, outcome.providerPaymentId, outcome.orderId, outcome.orderNumber);
        if (!orderId) {
          this.logger.warn(`${provider} ${outcome.type}: no order for payment ${outcome.providerPaymentId}; ignored`);
          return;
        }
        if (outcome.status === 'SUCCEEDED') {
          await this.payments.settle(orderId, provider, outcome.providerPaymentId, outcome);
        } else if (outcome.status === 'FAILED') {
          await this.prisma.payment.updateMany({
            where: { providerPaymentId: outcome.providerPaymentId, status: 'PENDING' },
            data: { status: 'FAILED', errorMessage: outcome.errorMessage?.slice(0, 500) ?? null },
          });
        } else if (outcome.captureId) {
          await this.prisma.payment.updateMany({
            where: { providerPaymentId: outcome.providerPaymentId, providerCaptureId: null },
            data: { providerCaptureId: outcome.captureId },
          });
        }
        return;
      }
      case 'refund': {
        const result = await this.refunds.applyProviderStatus(outcome.providerRefundId, outcome.status);
        if (result === 'unknown') {
          this.logger.warn(`${provider} refund ${outcome.providerRefundId} not found (made outside the admin panel?)`);
        }
        return;
      }
      case 'reversal': {
        const orderId = await this.findOrderId(provider, outcome.providerPaymentId, null, null);
        if (orderId) {
          await this.refunds.flag(
            orderId,
            `${provider} reports the payment was reversed or disputed by the customer's bank (${outcome.type}). Check the ${provider} dashboard.`,
          );
        }
        return;
      }
      case 'ignored':
        return;
    }
  }

  private async findOrderId(
    provider: PaymentProvider,
    providerPaymentId: string,
    orderId: string | null | undefined,
    orderNumber: string | null | undefined,
  ): Promise<string | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { providerPaymentId },
      select: { orderId: true, provider: true },
    });
    if (payment) return payment.provider === provider ? payment.orderId : null;
    // The webhook beat our own write of the provider ID: use the metadata/reference
    if (orderId) {
      const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
      if (order) return order.id;
    }
    if (orderNumber) {
      const order = await this.prisma.order.findUnique({ where: { orderNumber }, select: { id: true } });
      if (order) return order.id;
    }
    return null;
  }
}
