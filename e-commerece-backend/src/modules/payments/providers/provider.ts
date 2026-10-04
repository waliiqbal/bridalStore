import type { PaymentProvider } from '../../../generated/prisma/enums.js';

// Our view of a provider payment / refund, whatever the provider calls it.
export type ProviderPaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';
export type ProviderRefundStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';

export interface CreatePaymentInput {
  orderId: string;
  orderNumber: string;
  // Always from the Order in the database (cents, order currency)
  amount: number;
  currencyCode: string;
  // One per attempt; sent to the provider so a retried request can't charge twice
  idempotencyKey: string;
  // Square: the card token from the Web Payments SDK (+ optional buyer verification)
  sourceId?: string;
  verificationToken?: string;
}

export interface CreatePaymentResult {
  // Stripe PaymentIntent ID / Square payment ID / PayPal order ID. Square may
  // not return one when a card is declined.
  providerPaymentId: string | null;
  status: ProviderPaymentStatus;
  // Stripe: for the Payment Element in the browser
  clientSecret?: string;
  // PayPal: the capture ID once captured
  captureId?: string | null;
  amount?: number;
  currencyCode?: string;
  // Shopper-friendly reason when FAILED
  errorMessage?: string;
}

export interface ProviderPaymentState {
  status: ProviderPaymentStatus;
  amount: number;
  currencyCode: string;
  captureId?: string | null;
  // PayPal: approved by the buyer but not captured yet
  needsCapture?: boolean;
  errorMessage?: string;
}

export interface RefundInput {
  providerPaymentId: string;
  providerCaptureId: string | null;
  amount: number;
  currencyCode: string;
  idempotencyKey: string;
  reason: string;
}

export interface RefundResult {
  providerRefundId: string | null;
  status: ProviderRefundStatus;
  errorMessage?: string;
}

/** What a verified webhook means for us. Unknown event types are "ignored". */
export type WebhookOutcome =
  | {
      kind: 'payment';
      eventId: string;
      type: string;
      providerPaymentId: string;
      status: ProviderPaymentStatus;
      amount: number;
      currencyCode: string;
      captureId?: string | null;
      // To find the order if the Payment row isn't linked yet
      orderId?: string | null;
      orderNumber?: string | null;
      errorMessage?: string;
    }
  | { kind: 'refund'; eventId: string; type: string; providerRefundId: string; status: ProviderRefundStatus }
  // Money taken back by the provider/bank (chargeback, PayPal reversal)
  | { kind: 'reversal'; eventId: string; type: string; providerPaymentId: string; captureId?: string | null }
  | { kind: 'ignored'; eventId: string; type: string };

export type WebhookHeaders = Record<string, string | string[] | undefined>;

export class InvalidWebhookSignatureError extends Error {}

export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getStatus(providerPaymentId: string): Promise<ProviderPaymentState>;
  /** Throws InvalidWebhookSignatureError when the signature doesn't check out. */
  verifyAndParseWebhook(rawBody: Buffer, headers: WebhookHeaders): Promise<WebhookOutcome>;
  refund(input: RefundInput): Promise<RefundResult>;
  /** PayPal only: capture an approved order on the server. */
  capture?(providerPaymentId: string, idempotencyKey: string): Promise<ProviderPaymentState>;
}

export const PAYMENT_ADAPTERS = Symbol('PAYMENT_ADAPTERS');
export type PaymentAdapters = Partial<Record<PaymentProvider, PaymentProviderAdapter>>;

export function header(headers: WebhookHeaders, name: string): string {
  const value = headers[name.toLowerCase()];
  return (Array.isArray(value) ? value[0] : value) ?? '';
}
