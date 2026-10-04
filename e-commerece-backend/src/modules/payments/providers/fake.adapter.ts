import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import type { PaymentProvider } from '../../../generated/prisma/enums.js';
import {
  header,
  InvalidWebhookSignatureError,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type PaymentProviderAdapter,
  type ProviderPaymentState,
  type ProviderPaymentStatus,
  type RefundInput,
  type RefundResult,
  type WebhookHeaders,
  type WebhookOutcome,
} from './provider.js';

// PAYMENTS_DRIVER=fake (tests only — refused in production). Behaves like a
// provider: payments, refunds and HMAC-signed webhooks, all in memory.
export const FAKE_WEBHOOK_SECRET = 'fake-webhook-secret-for-tests-only';
export const FAKE_SIGNATURE_HEADER = 'x-fake-signature';
export const FAKE_DECLINED_CARD = 'fake-card-declined';

interface FakePayment {
  status: ProviderPaymentStatus;
  amount: number;
  currencyCode: string;
  captureId: string | null;
  approved: boolean;
}

export class FakeAdapter implements PaymentProviderAdapter {
  readonly payments = new Map<string, FakePayment>();
  readonly refunds = new Map<string, RefundInput>();
  // Tests can make the next refund stay PENDING (to test refund webhooks)
  nextRefundStatus: 'SUCCEEDED' | 'PENDING' = 'SUCCEEDED';

  constructor(readonly provider: PaymentProvider) {}

  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (this.provider === 'SQUARE' && !input.sourceId) throw new BadRequestException('Missing card token');
    if (input.sourceId === FAKE_DECLINED_CARD) {
      return Promise.resolve({ providerPaymentId: null, status: 'FAILED', errorMessage: 'Your card was declined. Please try another card or payment method.' });
    }
    const id = `fake_${this.provider.toLowerCase()}_${randomUUID()}`;
    // Square charges immediately; Stripe and PayPal wait for the shopper
    const status: ProviderPaymentStatus = this.provider === 'SQUARE' ? 'SUCCEEDED' : 'PENDING';
    this.payments.set(id, { status, amount: input.amount, currencyCode: input.currencyCode, captureId: null, approved: false });
    return Promise.resolve({
      providerPaymentId: id,
      status,
      clientSecret: this.provider === 'STRIPE' ? `${id}_secret_fake` : undefined,
      amount: input.amount,
      currencyCode: input.currencyCode,
    });
  }

  getStatus(providerPaymentId: string): Promise<ProviderPaymentState> {
    const p = this.payments.get(providerPaymentId);
    if (!p) return Promise.reject(new Error(`Unknown fake payment ${providerPaymentId}`));
    return Promise.resolve({
      status: p.status,
      amount: p.amount,
      currencyCode: p.currencyCode,
      captureId: p.captureId,
      needsCapture: this.provider === 'PAYPAL' && p.approved && p.status === 'PENDING',
    });
  }

  capture(providerPaymentId: string): Promise<ProviderPaymentState> {
    const p = this.payments.get(providerPaymentId);
    if (!p) return Promise.reject(new Error(`Unknown fake payment ${providerPaymentId}`));
    if (p.status === 'PENDING') {
      p.status = 'SUCCEEDED';
      p.captureId = `fake_capture_${randomUUID()}`;
    }
    return this.getStatus(providerPaymentId);
  }

  verifyAndParseWebhook(rawBody: Buffer, headers: WebhookHeaders): Promise<WebhookOutcome> {
    const expected = Buffer.from(fakeSignature(rawBody));
    const given = Buffer.from(header(headers, FAKE_SIGNATURE_HEADER));
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
      return Promise.reject(new InvalidWebhookSignatureError('Invalid fake signature'));
    }
    return Promise.resolve(JSON.parse(rawBody.toString('utf8')) as WebhookOutcome);
  }

  refund(input: RefundInput): Promise<RefundResult> {
    const id = `fake_refund_${randomUUID()}`;
    this.refunds.set(id, input);
    return Promise.resolve({ providerRefundId: id, status: this.nextRefundStatus });
  }

  // ── Test helpers: act like the provider ──

  // The shopper completed the payment (Stripe) or approved it (PayPal).
  complete(providerPaymentId: string, overrides: Partial<Pick<FakePayment, 'amount' | 'currencyCode'>> = {}) {
    const p = this.payments.get(providerPaymentId);
    if (!p) throw new Error(`Unknown fake payment ${providerPaymentId}`);
    if (this.provider === 'PAYPAL') p.approved = true;
    else Object.assign(p, { status: 'SUCCEEDED' as const }, overrides);
  }

  // A webhook delivery: { body, headers } to POST to /api/webhooks/<provider>.
  webhook(outcome: WebhookOutcome): { body: string; headers: Record<string, string> } {
    const body = JSON.stringify(outcome);
    return { body, headers: { 'content-type': 'application/json', [FAKE_SIGNATURE_HEADER]: fakeSignature(Buffer.from(body)) } };
  }
}

function fakeSignature(body: Buffer): string {
  return createHmac('sha256', FAKE_WEBHOOK_SECRET).update(body).digest('hex');
}
