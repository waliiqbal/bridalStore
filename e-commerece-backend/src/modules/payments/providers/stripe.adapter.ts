import Stripe from 'stripe';
import type { StripeEnv } from '../../../config/payments-env.js';
import {
  header,
  InvalidWebhookSignatureError,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type PaymentProviderAdapter,
  type ProviderPaymentState,
  type ProviderPaymentStatus,
  type ProviderRefundStatus,
  type RefundInput,
  type RefundResult,
  type WebhookHeaders,
  type WebhookOutcome,
} from './provider.js';

// PaymentIntent statuses (docs.stripe.com/payments/paymentintents/lifecycle)
export function mapStripePaymentStatus(status: string): ProviderPaymentStatus {
  if (status === 'succeeded') return 'SUCCEEDED';
  if (status === 'canceled') return 'FAILED';
  // requires_payment_method (incl. after a decline — the shopper can retry),
  // requires_confirmation, requires_action, processing, requires_capture
  return 'PENDING';
}

export function mapStripeRefundStatus(status: string | null | undefined): ProviderRefundStatus {
  if (status === 'succeeded') return 'SUCCEEDED';
  if (status === 'failed' || status === 'canceled') return 'FAILED';
  return 'PENDING'; // pending, requires_action
}

const PAYMENT_EVENTS = new Set([
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'payment_intent.processing',
]);
const REFUND_EVENTS = new Set(['refund.created', 'refund.updated', 'refund.failed']);

export class StripeAdapter implements PaymentProviderAdapter {
  readonly provider = 'STRIPE' as const;

  constructor(
    private readonly config: StripeEnv,
    private readonly stripe: Stripe = new Stripe(config.secretKey, {
      maxNetworkRetries: 2,
      appInfo: { name: 'malikah-bridal-store' },
    }),
  ) {}

  // Cards, Apple Pay and Google Pay through automatic payment methods.
  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const intent = await this.stripe.paymentIntents.create(
      {
        amount: input.amount,
        currency: input.currencyCode.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        description: `Order ${input.orderNumber}`,
        metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
      },
      { idempotencyKey: input.idempotencyKey },
    );
    return {
      providerPaymentId: intent.id,
      status: mapStripePaymentStatus(intent.status),
      clientSecret: intent.client_secret ?? undefined,
      amount: intent.amount,
      currencyCode: intent.currency.toUpperCase(),
    };
  }

  async getStatus(providerPaymentId: string): Promise<ProviderPaymentState> {
    const intent = await this.stripe.paymentIntents.retrieve(providerPaymentId);
    return {
      status: mapStripePaymentStatus(intent.status),
      amount: intent.status === 'succeeded' ? intent.amount_received : intent.amount,
      currencyCode: intent.currency.toUpperCase(),
      errorMessage: intent.last_payment_error?.message,
    };
  }

  async verifyAndParseWebhook(rawBody: Buffer, headers: WebhookHeaders): Promise<WebhookOutcome> {
    let event: Stripe.Event;
    try {
      // HMAC-SHA256 of the raw body; rejects timestamps older than 5 minutes
      event = this.stripe.webhooks.constructEvent(rawBody, header(headers, 'stripe-signature'), this.config.webhookSecret);
    } catch (error) {
      throw new InvalidWebhookSignatureError(error instanceof Error ? error.message : 'Invalid Stripe signature');
    }

    if (PAYMENT_EVENTS.has(event.type)) {
      const intent = event.data.object as Stripe.PaymentIntent;
      return {
        kind: 'payment',
        eventId: event.id,
        type: event.type,
        providerPaymentId: intent.id,
        status: mapStripePaymentStatus(intent.status),
        amount: intent.status === 'succeeded' ? intent.amount_received : intent.amount,
        currencyCode: intent.currency.toUpperCase(),
        orderId: intent.metadata?.orderId ?? null,
        orderNumber: intent.metadata?.orderNumber ?? null,
        errorMessage: intent.last_payment_error?.message,
      };
    }
    if (REFUND_EVENTS.has(event.type)) {
      const refund = event.data.object as Stripe.Refund;
      return { kind: 'refund', eventId: event.id, type: event.type, providerRefundId: refund.id, status: mapStripeRefundStatus(refund.status) };
    }
    if (event.type === 'charge.dispute.created') {
      const dispute = event.data.object as Stripe.Dispute;
      const intent = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id;
      if (intent) return { kind: 'reversal', eventId: event.id, type: event.type, providerPaymentId: intent };
    }
    return { kind: 'ignored', eventId: event.id, type: event.type };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const refund = await this.stripe.refunds.create(
      {
        payment_intent: input.providerPaymentId,
        amount: input.amount,
        reason: 'requested_by_customer',
        metadata: { reason: input.reason.slice(0, 500) },
      },
      { idempotencyKey: input.idempotencyKey },
    );
    return { providerRefundId: refund.id, status: mapStripeRefundStatus(refund.status) };
  }
}
