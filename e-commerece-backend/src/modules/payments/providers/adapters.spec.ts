import { createHmac } from 'node:crypto';
import { OrdersController, PaymentsController } from '@paypal/paypal-server-sdk';
import { SquareError } from 'square';
import Stripe from 'stripe';
import {
  mapPayPalCaptureStatus,
  mapPayPalRefundStatus,
  parsePayPalEvent,
  PayPalAdapter,
  payPalOrderState,
} from './paypal.adapter.js';
import { InvalidWebhookSignatureError } from './provider.js';
import { mapSquarePaymentStatus, mapSquareRefundStatus, SquareAdapter, squareDeclineMessage } from './square.adapter.js';
import { mapStripePaymentStatus, mapStripeRefundStatus, StripeAdapter } from './stripe.adapter.js';

const input = { orderId: 'ord_1', orderNumber: 'MBS-10001', amount: 21500, currencyCode: 'AUD', idempotencyKey: 'key-1' };

describe('Stripe adapter', () => {
  const env = { secretKey: 'sk_test_x', publishableKey: 'pk_test_x', webhookSecret: 'whsec_test_secret', environment: 'sandbox' as const };
  const realStripe = new Stripe('sk_test_x');

  it('maps PaymentIntent and Refund statuses', () => {
    expect(mapStripePaymentStatus('succeeded')).toBe('SUCCEEDED');
    expect(mapStripePaymentStatus('canceled')).toBe('FAILED');
    for (const s of ['requires_payment_method', 'requires_action', 'processing', 'requires_confirmation']) {
      expect(mapStripePaymentStatus(s)).toBe('PENDING');
    }
    expect(mapStripeRefundStatus('succeeded')).toBe('SUCCEEDED');
    expect(mapStripeRefundStatus('failed')).toBe('FAILED');
    expect(mapStripeRefundStatus('canceled')).toBe('FAILED');
    expect(mapStripeRefundStatus('pending')).toBe('PENDING');
  });

  it('creates a PaymentIntent with the order amount, metadata and idempotency key', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'pi_1', status: 'requires_payment_method', client_secret: 'pi_1_secret', amount: 21500, currency: 'aud' });
    const adapter = new StripeAdapter(env, { paymentIntents: { create } } as unknown as Stripe);
    const result = await adapter.createPayment(input);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 21500,
        currency: 'aud',
        automatic_payment_methods: { enabled: true },
        metadata: { orderId: 'ord_1', orderNumber: 'MBS-10001' },
      }),
      { idempotencyKey: 'key-1' },
    );
    expect(result).toMatchObject({ providerPaymentId: 'pi_1', clientSecret: 'pi_1_secret', status: 'PENDING' });
  });

  it('verifies the Stripe-Signature over the raw body and parses payment and refund events', async () => {
    const adapter = new StripeAdapter(env, realStripe);
    const sign = (payload: string) => ({
      'stripe-signature': realStripe.webhooks.generateTestHeaderString({ payload, secret: env.webhookSecret }),
    });
    const succeeded = JSON.stringify({
      id: 'evt_1',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1', object: 'payment_intent', status: 'succeeded', amount: 21500, amount_received: 21500, currency: 'aud', metadata: { orderId: 'ord_1', orderNumber: 'MBS-10001' } } },
    });
    await expect(adapter.verifyAndParseWebhook(Buffer.from(succeeded), sign(succeeded))).resolves.toEqual({
      kind: 'payment',
      eventId: 'evt_1',
      type: 'payment_intent.succeeded',
      providerPaymentId: 'pi_1',
      status: 'SUCCEEDED',
      amount: 21500,
      currencyCode: 'AUD',
      orderId: 'ord_1',
      orderNumber: 'MBS-10001',
      errorMessage: undefined,
    });

    const refund = JSON.stringify({ id: 'evt_2', object: 'event', type: 'refund.updated', data: { object: { id: 're_1', object: 'refund', status: 'succeeded' } } });
    await expect(adapter.verifyAndParseWebhook(Buffer.from(refund), sign(refund))).resolves.toMatchObject({
      kind: 'refund',
      providerRefundId: 're_1',
      status: 'SUCCEEDED',
    });

    // Tampered body, or a signature made with another secret
    await expect(adapter.verifyAndParseWebhook(Buffer.from(succeeded.replace('21500', '1')), sign(succeeded))).rejects.toThrow(
      InvalidWebhookSignatureError,
    );
    const otherSecret = { 'stripe-signature': realStripe.webhooks.generateTestHeaderString({ payload: succeeded, secret: 'whsec_other' }) };
    await expect(adapter.verifyAndParseWebhook(Buffer.from(succeeded), otherSecret)).rejects.toThrow(InvalidWebhookSignatureError);
  });

  it('refunds by PaymentIntent with the refund idempotency key', async () => {
    const create = vi.fn().mockResolvedValue({ id: 're_1', status: 'pending' });
    const adapter = new StripeAdapter(env, { refunds: { create } } as unknown as Stripe);
    await expect(
      adapter.refund({ providerPaymentId: 'pi_1', providerCaptureId: null, amount: 500, currencyCode: 'USD', idempotencyKey: 'r-1', reason: 'Too long' }),
    ).resolves.toEqual({ providerRefundId: 're_1', status: 'PENDING' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ payment_intent: 'pi_1', amount: 500 }), { idempotencyKey: 'r-1' });
  });
});

describe('Square adapter', () => {
  const env = {
    environment: 'sandbox' as const,
    accessToken: 't',
    applicationId: 'sandbox-app',
    locationId: 'LOC1',
    webhookSignatureKey: 'square-signature-key',
    webhookUrl: 'https://api.example.com/api/webhooks/square',
  };

  it('maps payment and refund statuses', () => {
    expect(mapSquarePaymentStatus('COMPLETED')).toBe('SUCCEEDED');
    expect(mapSquarePaymentStatus('APPROVED')).toBe('PENDING');
    expect(mapSquarePaymentStatus('PENDING')).toBe('PENDING');
    expect(mapSquarePaymentStatus('CANCELED')).toBe('FAILED');
    expect(mapSquarePaymentStatus('FAILED')).toBe('FAILED');
    expect(mapSquareRefundStatus('COMPLETED')).toBe('SUCCEEDED');
    expect(mapSquareRefundStatus('PENDING')).toBe('PENDING');
    expect(mapSquareRefundStatus('REJECTED')).toBe('FAILED');
    expect(mapSquareRefundStatus('FAILED')).toBe('FAILED');
  });

  it('charges the token in AUD at the configured location, amounts as BigInt', async () => {
    const create = vi.fn().mockResolvedValue({ payment: { id: 'sq_1', status: 'COMPLETED', amountMoney: { amount: 21500n, currency: 'AUD' } } });
    const adapter = new SquareAdapter(env, { payments: { create } } as never);
    await expect(adapter.createPayment({ ...input, sourceId: 'cnon:card' })).resolves.toMatchObject({
      providerPaymentId: 'sq_1',
      status: 'SUCCEEDED',
      amount: 21500,
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'cnon:card',
        idempotencyKey: 'key-1',
        amountMoney: { amount: 21500n, currency: 'AUD' },
        locationId: 'LOC1',
        referenceId: 'MBS-10001',
        autocomplete: true,
      }),
    );
  });

  it('turns a card decline into a friendly FAILED result', async () => {
    const declined = new SquareError({ statusCode: 402, body: { errors: [{ category: 'PAYMENT_METHOD_ERROR', code: 'CARD_DECLINED' }] } });
    const adapter = new SquareAdapter(env, { payments: { create: vi.fn().mockRejectedValue(declined) } } as never);
    await expect(adapter.createPayment({ ...input, sourceId: 'cnon:card' })).resolves.toEqual({
      providerPaymentId: null,
      status: 'FAILED',
      errorMessage: squareDeclineMessage(declined),
    });
    expect(squareDeclineMessage(declined)).toMatch(/card was declined/);
  });

  it('verifies x-square-hmacsha256-signature over URL + raw body and parses events', async () => {
    const adapter = new SquareAdapter(env, {} as never);
    const body = JSON.stringify({
      event_id: 'sq-evt-1',
      type: 'payment.updated',
      data: { object: { payment: { id: 'sq_1', status: 'COMPLETED', reference_id: 'MBS-10001', amount_money: { amount: 21500, currency: 'AUD' } } } },
    });
    const signature = createHmac('sha256', env.webhookSignatureKey).update(env.webhookUrl + body).digest('base64');
    await expect(adapter.verifyAndParseWebhook(Buffer.from(body), { 'x-square-hmacsha256-signature': signature })).resolves.toEqual({
      kind: 'payment',
      eventId: 'sq-evt-1',
      type: 'payment.updated',
      providerPaymentId: 'sq_1',
      status: 'SUCCEEDED',
      amount: 21500,
      currencyCode: 'AUD',
      orderNumber: 'MBS-10001',
    });
    await expect(
      adapter.verifyAndParseWebhook(Buffer.from(body.replace('21500', '1')), { 'x-square-hmacsha256-signature': signature }),
    ).rejects.toThrow(InvalidWebhookSignatureError);
  });
});

describe('PayPal adapter', () => {
  const env = { environment: 'sandbox' as const, clientId: 'id', clientSecret: 'secret', webhookId: 'WH-1' };
  afterEach(() => vi.restoreAllMocks());

  it('maps capture and refund statuses, and order states', () => {
    expect(mapPayPalCaptureStatus('COMPLETED')).toBe('SUCCEEDED');
    expect(mapPayPalCaptureStatus('PARTIALLY_REFUNDED')).toBe('SUCCEEDED');
    expect(mapPayPalCaptureStatus('PENDING')).toBe('PENDING');
    expect(mapPayPalCaptureStatus('DECLINED')).toBe('FAILED');
    expect(mapPayPalRefundStatus('COMPLETED')).toBe('SUCCEEDED');
    expect(mapPayPalRefundStatus('CANCELLED')).toBe('FAILED');
    expect(payPalOrderState({ status: 'APPROVED' as never, purchaseUnits: [{ amount: { currencyCode: 'USD', value: '81.00' } }] })).toEqual({
      status: 'PENDING',
      needsCapture: true,
      amount: 8100,
      currencyCode: 'USD',
      captureId: null,
    });
    expect(
      payPalOrderState({
        status: 'COMPLETED' as never,
        purchaseUnits: [{ payments: { captures: [{ id: 'CAP1', status: 'COMPLETED' as never, amount: { currencyCode: 'USD', value: '81.00' } }] } }],
      }),
    ).toEqual({ status: 'SUCCEEDED', amount: 8100, currencyCode: 'USD', captureId: 'CAP1' });
  });

  it('creates a CAPTURE order with the amount as a decimal string and the request id', async () => {
    const spy = vi.spyOn(OrdersController.prototype, 'createOrder').mockResolvedValue({ result: { id: 'PP-ORDER-1' } } as never);
    const adapter = new PayPalAdapter(env);
    await expect(adapter.createPayment({ ...input, currencyCode: 'USD', amount: 8100 })).resolves.toMatchObject({
      providerPaymentId: 'PP-ORDER-1',
      status: 'PENDING',
    });
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        paypalRequestId: 'key-1',
        body: expect.objectContaining({
          intent: 'CAPTURE',
          purchaseUnits: [expect.objectContaining({ referenceId: 'MBS-10001', customId: 'ord_1', amount: { currencyCode: 'USD', value: '81.00' } })],
        }),
      }),
    );
  });

  it('refunds the capture', async () => {
    const spy = vi.spyOn(PaymentsController.prototype, 'refundCapturedPayment').mockResolvedValue({ result: { id: 'REF1', status: 'COMPLETED' } } as never);
    const adapter = new PayPalAdapter(env);
    await expect(
      adapter.refund({ providerPaymentId: 'PP-ORDER-1', providerCaptureId: 'CAP1', amount: 2050, currencyCode: 'USD', idempotencyKey: 'r1', reason: 'Damaged' }),
    ).resolves.toEqual({ providerRefundId: 'REF1', status: 'SUCCEEDED' });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ captureId: 'CAP1', paypalRequestId: 'r1', body: expect.objectContaining({ amount: { currencyCode: 'USD', value: '20.50' } }) }));
  });

  it('verifies webhooks with PayPal’s API, sending the event body unmodified', async () => {
    const raw = '{"id":"WH-EVT-1","event_type":"PAYMENT.CAPTURE.COMPLETED","resource":{"id":"CAP1","status":"COMPLETED","custom_id":"ord_1","amount":{"value":"81.00","currency_code":"USD"},"supplementary_data":{"related_ids":{"order_id":"PP-ORDER-1"}}}}';
    const headers = {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/cert',
      'paypal-transmission-id': 't-1',
      'paypal-transmission-sig': 'sig',
      'paypal-transmission-time': '2026-10-04T12:00:00Z',
    };
    const http = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/v1/oauth2/token')) return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }));
      expect(init?.headers).toMatchObject({ authorization: 'Bearer tok' });
      expect(String(init?.body)).toContain(`"webhook_event":${raw}}`);
      expect(JSON.parse(String(init?.body))).toMatchObject({ webhook_id: 'WH-1', auth_algo: 'SHA256withRSA', transmission_id: 't-1' });
      return new Response(JSON.stringify({ verification_status: 'SUCCESS' }));
    });
    const adapter = new PayPalAdapter(env, undefined, http as unknown as typeof fetch);
    await expect(adapter.verifyAndParseWebhook(Buffer.from(raw), headers)).resolves.toEqual({
      kind: 'payment',
      eventId: 'WH-EVT-1',
      type: 'PAYMENT.CAPTURE.COMPLETED',
      providerPaymentId: 'PP-ORDER-1',
      captureId: 'CAP1',
      status: 'SUCCEEDED',
      amount: 8100,
      currencyCode: 'USD',
      orderId: 'ord_1',
    });

    const failing = vi.fn(async (url: string) =>
      new Response(JSON.stringify(url.endsWith('/token') ? { access_token: 'tok', expires_in: 3600 } : { verification_status: 'FAILURE' })),
    );
    await expect(
      new PayPalAdapter(env, undefined, failing as unknown as typeof fetch).verifyAndParseWebhook(Buffer.from(raw), headers),
    ).rejects.toThrow(InvalidWebhookSignatureError);
    await expect(new PayPalAdapter(env).verifyAndParseWebhook(Buffer.from(raw), {})).rejects.toThrow(InvalidWebhookSignatureError);
  });

  it('parses refund and reversal events', () => {
    expect(parsePayPalEvent({ id: 'e1', event_type: 'PAYMENT.CAPTURE.REFUNDED', resource: { id: 'REF1', status: 'COMPLETED' } })).toMatchObject({
      kind: 'refund',
      providerRefundId: 'REF1',
      status: 'SUCCEEDED',
    });
    expect(parsePayPalEvent({ id: 'e2', event_type: 'PAYMENT.REFUND.FAILED', resource: { id: 'REF2' } })).toMatchObject({ kind: 'refund', status: 'FAILED' });
    expect(
      parsePayPalEvent({ id: 'e3', event_type: 'PAYMENT.CAPTURE.REVERSED', resource: { id: 'CAP1', supplementary_data: { related_ids: { order_id: 'PP1' } } } }),
    ).toMatchObject({ kind: 'reversal', providerPaymentId: 'PP1' });
    expect(parsePayPalEvent({ id: 'e4', event_type: 'CHECKOUT.ORDER.APPROVED', resource: {} })).toEqual({ kind: 'ignored', eventId: 'e4', type: 'CHECKOUT.ORDER.APPROVED' });
  });
});
