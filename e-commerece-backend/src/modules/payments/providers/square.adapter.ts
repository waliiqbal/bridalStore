import { BadRequestException } from '@nestjs/common';
import { SquareClient, SquareEnvironment, SquareError, WebhooksHelper, type Square } from 'square';
import type { SquareEnv } from '../../../config/payments-env.js';
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

// Payment.status: APPROVED, PENDING, COMPLETED, CANCELED or FAILED
export function mapSquarePaymentStatus(status: string | null | undefined): ProviderPaymentStatus {
  if (status === 'COMPLETED') return 'SUCCEEDED';
  if (status === 'CANCELED' || status === 'FAILED') return 'FAILED';
  return 'PENDING'; // APPROVED (not captured), PENDING
}

// PaymentRefund.status: PENDING, COMPLETED, REJECTED or FAILED
export function mapSquareRefundStatus(status: string | null | undefined): ProviderRefundStatus {
  if (status === 'COMPLETED') return 'SUCCEEDED';
  if (status === 'REJECTED' || status === 'FAILED') return 'FAILED';
  return 'PENDING';
}

const DECLINE_CODES = new Set([
  'CARD_DECLINED',
  'GENERIC_DECLINE',
  'INSUFFICIENT_FUNDS',
  'CVV_FAILURE',
  'ADDRESS_VERIFICATION_FAILURE',
  'INVALID_EXPIRATION',
  'CARD_EXPIRED',
  'VERIFY_CVV_FAILURE',
  'VERIFY_AVS_FAILURE',
  'CARD_DECLINED_VERIFICATION_REQUIRED',
  'TRANSACTION_LIMIT',
]);

// Shopper-friendly message from a Square error (never includes card details).
export function squareDeclineMessage(error: SquareError): string {
  const codes = (error.errors ?? []).map((e) => e.code);
  if (codes.some((c) => c === 'CVV_FAILURE' || c === 'VERIFY_CVV_FAILURE')) {
    return 'The security code (CVV) was not accepted. Please check it and try again.';
  }
  if (codes.some((c) => DECLINE_CODES.has(c))) {
    return 'Your card was declined. Please try another card or payment method.';
  }
  return 'We could not process this card. Please try again or use another payment method.';
}

interface SquareWebhookBody {
  event_id?: string;
  type?: string;
  data?: {
    object?: {
      payment?: { id?: string; status?: string; reference_id?: string; amount_money?: { amount?: number; currency?: string } };
      refund?: { id?: string; status?: string };
      dispute?: { disputed_payment?: { payment_id?: string } };
    };
  };
}

export class SquareAdapter implements PaymentProviderAdapter {
  readonly provider = 'SQUARE' as const;

  constructor(
    private readonly config: SquareEnv,
    private readonly client: SquareClient = new SquareClient({
      token: config.accessToken,
      environment: config.environment === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    }),
  ) {}

  // The card was tokenized in the browser (Web Payments SDK); we never see card data.
  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!input.sourceId) throw new BadRequestException('Missing card token');
    try {
      const { payment } = await this.client.payments.create({
        sourceId: input.sourceId,
        verificationToken: input.verificationToken,
        idempotencyKey: input.idempotencyKey, // max 45 characters
        amountMoney: { amount: BigInt(input.amount), currency: input.currencyCode as Square.Currency },
        locationId: this.config.locationId,
        referenceId: input.orderNumber,
        note: `Order ${input.orderNumber}`,
        autocomplete: true,
      });
      return {
        providerPaymentId: payment?.id ?? null,
        status: mapSquarePaymentStatus(payment?.status),
        amount: Number(payment?.amountMoney?.amount ?? 0n),
        currencyCode: payment?.amountMoney?.currency ?? input.currencyCode,
      };
    } catch (error) {
      if (error instanceof SquareError && error.statusCode !== undefined && error.statusCode < 500) {
        return { providerPaymentId: null, status: 'FAILED', errorMessage: squareDeclineMessage(error) };
      }
      throw error;
    }
  }

  async getStatus(providerPaymentId: string): Promise<ProviderPaymentState> {
    const { payment } = await this.client.payments.get({ paymentId: providerPaymentId });
    return {
      status: mapSquarePaymentStatus(payment?.status),
      amount: Number(payment?.amountMoney?.amount ?? 0n),
      currencyCode: payment?.amountMoney?.currency ?? 'AUD',
    };
  }

  async verifyAndParseWebhook(rawBody: Buffer, headers: WebhookHeaders): Promise<WebhookOutcome> {
    const requestBody = rawBody.toString('utf8');
    // HMAC-SHA256 of notification URL + raw body with the subscription's signature key
    const valid = await WebhooksHelper.verifySignature({
      requestBody,
      signatureHeader: header(headers, 'x-square-hmacsha256-signature'),
      signatureKey: this.config.webhookSignatureKey,
      notificationUrl: this.config.webhookUrl,
    }).catch(() => false);
    if (!valid) throw new InvalidWebhookSignatureError('Invalid Square signature');

    const body = JSON.parse(requestBody) as SquareWebhookBody;
    const eventId = body.event_id ?? '';
    const type = body.type ?? 'unknown';
    const object = body.data?.object;

    if ((type === 'payment.created' || type === 'payment.updated') && object?.payment?.id) {
      const p = object.payment;
      return {
        kind: 'payment',
        eventId,
        type,
        providerPaymentId: p.id!,
        status: mapSquarePaymentStatus(p.status),
        amount: Number(p.amount_money?.amount ?? 0),
        currencyCode: p.amount_money?.currency ?? 'AUD',
        orderNumber: p.reference_id ?? null,
      };
    }
    if ((type === 'refund.created' || type === 'refund.updated') && object?.refund?.id) {
      return { kind: 'refund', eventId, type, providerRefundId: object.refund.id, status: mapSquareRefundStatus(object.refund.status) };
    }
    if (type === 'dispute.created' && object?.dispute?.disputed_payment?.payment_id) {
      return { kind: 'reversal', eventId, type, providerPaymentId: object.dispute.disputed_payment.payment_id };
    }
    return { kind: 'ignored', eventId, type };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    try {
      const { refund } = await this.client.refunds.refundPayment({
        idempotencyKey: input.idempotencyKey,
        paymentId: input.providerPaymentId,
        amountMoney: { amount: BigInt(input.amount), currency: input.currencyCode as Square.Currency },
        reason: input.reason.slice(0, 192),
      });
      return { providerRefundId: refund?.id ?? null, status: mapSquareRefundStatus(refund?.status) };
    } catch (error) {
      if (error instanceof SquareError && error.statusCode !== undefined && error.statusCode < 500) {
        return { providerRefundId: null, status: 'FAILED', errorMessage: (error.errors ?? []).map((e) => e.detail ?? e.code).join('; ') };
      }
      throw error;
    }
  }
}
