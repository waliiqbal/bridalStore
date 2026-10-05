import {
  ApiError,
  CheckoutPaymentIntent,
  Client,
  Environment,
  OrdersController,
  PaymentsController,
  type Order,
} from '@paypal/paypal-server-sdk';
import type { PayPalEnv } from '../../../config/payments-env.js';
import { centsToDecimal, decimalToCents } from '../payment-rules.js';
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

// Capture statuses: COMPLETED, DECLINED, PARTIALLY_REFUNDED, PENDING, REFUNDED, FAILED
export function mapPayPalCaptureStatus(status: string | null | undefined): ProviderPaymentStatus {
  if (status === 'COMPLETED' || status === 'REFUNDED' || status === 'PARTIALLY_REFUNDED') return 'SUCCEEDED';
  if (status === 'DECLINED' || status === 'FAILED') return 'FAILED';
  return 'PENDING';
}

// Refund statuses: CANCELLED, FAILED, PENDING, COMPLETED
export function mapPayPalRefundStatus(status: string | null | undefined): ProviderRefundStatus {
  if (status === 'COMPLETED') return 'SUCCEEDED';
  if (status === 'FAILED' || status === 'CANCELLED') return 'FAILED';
  return 'PENDING';
}

// Order (CREATED, SAVED, APPROVED, VOIDED, COMPLETED, PAYER_ACTION_REQUIRED) → our state
export function payPalOrderState(order: Pick<Order, 'status' | 'purchaseUnits'>): ProviderPaymentState {
  const unit = order.purchaseUnits?.[0];
  const capture = unit?.payments?.captures?.[0];
  const money = capture?.amount ?? unit?.amount;
  const base = {
    amount: money?.value ? decimalToCents(money.value) : 0,
    currencyCode: money?.currencyCode ?? '',
    captureId: capture?.id ?? null,
  };
  if (capture) return { ...base, status: mapPayPalCaptureStatus(capture.status) };
  if (order.status === 'APPROVED') return { ...base, status: 'PENDING', needsCapture: true };
  if (order.status === 'VOIDED') return { ...base, status: 'FAILED' };
  return { ...base, status: 'PENDING' };
}

interface PayPalWebhookBody {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    custom_id?: string;
    amount?: { value?: string; currency_code?: string };
    supplementary_data?: { related_ids?: { order_id?: string } };
  };
}

const API_BASE = { sandbox: 'https://api-m.sandbox.paypal.com', production: 'https://api-m.paypal.com' } as const;

export class PayPalAdapter implements PaymentProviderAdapter {
  readonly provider = 'PAYPAL' as const;
  private readonly orders: OrdersController;
  private readonly payments: PaymentsController;
  private token?: { value: string; expiresAt: number };

  constructor(
    private readonly config: PayPalEnv,
    client: Client = new Client({
      clientCredentialsAuthCredentials: { oAuthClientId: config.clientId, oAuthClientSecret: config.clientSecret },
      environment: config.environment === 'production' ? Environment.Production : Environment.Sandbox,
      timeout: 20_000,
    }),
    private readonly http: typeof fetch = fetch,
  ) {
    this.orders = new OrdersController(client);
    this.payments = new PaymentsController(client);
  }

  // Creates a PayPal order (intent CAPTURE); the shopper approves it in the PayPal popup.
  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const { result } = await this.orders.createOrder({
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            referenceId: input.orderNumber,
            customId: input.orderId,
            description: `Order ${input.orderNumber}`,
            amount: { currencyCode: input.currencyCode, value: centsToDecimal(input.amount) },
          },
        ],
      },
      paypalRequestId: input.idempotencyKey,
      prefer: 'return=minimal',
    });
    return { providerPaymentId: result.id ?? null, status: 'PENDING', amount: input.amount, currencyCode: input.currencyCode };
  }

  // Captures an approved order on the server.
  async capture(providerPaymentId: string, idempotencyKey: string): Promise<ProviderPaymentState> {
    try {
      const { result } = await this.orders.captureOrder({
        id: providerPaymentId,
        paypalRequestId: idempotencyKey,
        prefer: 'return=representation',
      });
      return payPalOrderState(result);
    } catch (error) {
      const issue = payPalIssue(error);
      if (issue === 'ORDER_ALREADY_CAPTURED') return this.getStatus(providerPaymentId);
      if (issue === 'INSTRUMENT_DECLINED' || issue === 'PAYER_ACTION_REQUIRED') {
        return {
          status: 'FAILED',
          amount: 0,
          currencyCode: '',
          errorMessage: 'PayPal could not complete the payment with that method. Please choose another one in PayPal.',
        };
      }
      throw error;
    }
  }

  async getStatus(providerPaymentId: string): Promise<ProviderPaymentState> {
    const { result } = await this.orders.getOrder({ id: providerPaymentId });
    return payPalOrderState(result);
  }

  /**
   * The SDK has no webhook verification, so we use PayPal's verification API:
   * POST /v1/notifications/verify-webhook-signature with the PAYPAL-* headers,
   * our webhook ID and the unmodified event body.
   */
  async verifyAndParseWebhook(rawBody: Buffer, headers: WebhookHeaders): Promise<WebhookOutcome> {
    const raw = rawBody.toString('utf8');
    const fields = {
      auth_algo: header(headers, 'paypal-auth-algo'),
      cert_url: header(headers, 'paypal-cert-url'),
      transmission_id: header(headers, 'paypal-transmission-id'),
      transmission_sig: header(headers, 'paypal-transmission-sig'),
      transmission_time: header(headers, 'paypal-transmission-time'),
      webhook_id: this.config.webhookId,
    };
    if (Object.values(fields).some((v) => !v)) throw new InvalidWebhookSignatureError('Missing PayPal signature headers');

    // The event goes in exactly as received (re-serialising could change it)
    const body = `${JSON.stringify(fields).slice(0, -1)},"webhook_event":${raw}}`;
    const res = await this.http(`${API_BASE[this.config.environment]}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${await this.accessToken()}` },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    const verdict = (await res.json().catch(() => ({}))) as { verification_status?: string };
    if (!res.ok || verdict.verification_status !== 'SUCCESS') {
      throw new InvalidWebhookSignatureError('PayPal webhook signature verification failed');
    }
    return parsePayPalEvent(JSON.parse(raw) as PayPalWebhookBody);
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    if (!input.providerCaptureId) return { providerRefundId: null, status: 'FAILED', errorMessage: 'No PayPal capture to refund' };
    try {
      const { result } = await this.payments.refundCapturedPayment({
        captureId: input.providerCaptureId,
        paypalRequestId: input.idempotencyKey,
        prefer: 'return=representation',
        body: {
          amount: { currencyCode: input.currencyCode, value: centsToDecimal(input.amount) },
          noteToPayer: input.reason.slice(0, 255),
        },
      });
      return { providerRefundId: result.id ?? null, status: mapPayPalRefundStatus(result.status) };
    } catch (error) {
      const issue = payPalIssue(error);
      if (issue) return { providerRefundId: null, status: 'FAILED', errorMessage: `PayPal: ${issue}` };
      throw error;
    }
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const res = await this.http(`${API_BASE[this.config.environment]}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`);
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
    return json.access_token;
  }
}

export function parsePayPalEvent(event: PayPalWebhookBody): WebhookOutcome {
  const eventId = event.id ?? '';
  const type = event.event_type ?? 'unknown';
  const r = event.resource ?? {};

  switch (type) {
    case 'PAYMENT.CAPTURE.COMPLETED':
    case 'PAYMENT.CAPTURE.PENDING':
    case 'PAYMENT.CAPTURE.DENIED':
    case 'PAYMENT.CAPTURE.DECLINED': {
      const orderId = r.supplementary_data?.related_ids?.order_id;
      if (!orderId || !r.id) break;
      return {
        kind: 'payment',
        eventId,
        type,
        providerPaymentId: orderId,
        captureId: r.id,
        status: mapPayPalCaptureStatus(r.status),
        amount: r.amount?.value ? decimalToCents(r.amount.value) : 0,
        currencyCode: r.amount?.currency_code ?? '',
        orderId: r.custom_id ?? null,
      };
    }
    // For these the resource is the refund
    case 'PAYMENT.CAPTURE.REFUNDED':
    case 'PAYMENT.REFUND.PENDING':
    case 'PAYMENT.REFUND.FAILED':
      if (!r.id) break;
      return {
        kind: 'refund',
        eventId,
        type,
        providerRefundId: r.id,
        status: type === 'PAYMENT.REFUND.FAILED' ? 'FAILED' : mapPayPalRefundStatus(r.status),
      };
    case 'PAYMENT.CAPTURE.REVERSED': {
      const orderId = r.supplementary_data?.related_ids?.order_id;
      if (orderId) return { kind: 'reversal', eventId, type, providerPaymentId: orderId, captureId: r.id ?? null };
      break;
    }
  }
  return { kind: 'ignored', eventId, type };
}

// The PayPal "issue" code (e.g. INSTRUMENT_DECLINED) from an API error, if any.
function payPalIssue(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  const result = error.result as { details?: { issue?: string }[]; name?: string } | undefined;
  return result?.details?.[0]?.issue ?? result?.name ?? null;
}
