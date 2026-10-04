import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { PaymentsService } from './payments.service.js';
import { FakeAdapter } from './providers/fake.adapter.js';
import type { RefundsService } from './refunds.service.js';
import { WebhooksService } from './webhooks.service.js';

// In-memory WebhookEvent table with the same unique rule as the database.
function fakePrisma() {
  const events = new Map<string, { processedAt: Date | null; error: string | null }>();
  const key = (w: { provider: string; eventId: string }) => `${w.provider}:${w.eventId}`;
  return {
    events,
    webhookEvent: {
      create: vi.fn(({ data }: { data: { provider: string; eventId: string } }) => {
        if (events.has(key(data))) {
          return Promise.reject(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }));
        }
        events.set(key(data), { processedAt: null, error: null });
        return Promise.resolve({});
      }),
      findUniqueOrThrow: vi.fn(({ where }: { where: { provider_eventId: { provider: string; eventId: string } } }) =>
        Promise.resolve(events.get(key(where.provider_eventId))!),
      ),
      update: vi.fn(({ where, data }: { where: { provider_eventId: { provider: string; eventId: string } }; data: object }) => {
        Object.assign(events.get(key(where.provider_eventId))!, data);
        return Promise.resolve({});
      }),
    },
    payment: {
      findUnique: vi.fn().mockResolvedValue({ orderId: 'ord_1', provider: 'STRIPE' }),
      updateMany: vi.fn(),
    },
    order: { findUnique: vi.fn() },
  };
}

describe('WebhooksService', () => {
  const fake = new FakeAdapter('STRIPE');
  const paid = fake.webhook({
    kind: 'payment',
    eventId: 'evt_1',
    type: 'payment_intent.succeeded',
    providerPaymentId: 'pi_1',
    status: 'SUCCEEDED',
    amount: 21500,
    currencyCode: 'AUD',
  });

  function setup() {
    const prisma = fakePrisma();
    const settle = vi.fn().mockResolvedValue('PAID');
    const service = new WebhooksService(
      prisma as unknown as PrismaService,
      { STRIPE: fake },
      { settle } as unknown as PaymentsService,
      { applyProviderStatus: vi.fn(), flag: vi.fn() } as unknown as RefundsService,
    );
    return { prisma, settle, service };
  }

  it('processes an event once; a repeated delivery is acknowledged and ignored', async () => {
    const { service, settle } = setup();
    await expect(service.handle('STRIPE', Buffer.from(paid.body), paid.headers)).resolves.toEqual({ received: true, duplicate: false });
    await expect(service.handle('STRIPE', Buffer.from(paid.body), paid.headers)).resolves.toEqual({ received: true, duplicate: true });
    expect(settle).toHaveBeenCalledTimes(1);
    expect(settle).toHaveBeenCalledWith('ord_1', 'STRIPE', 'pi_1', expect.objectContaining({ amount: 21500 }));
  });

  it('retries an event whose earlier processing failed, and records the error', async () => {
    const { service, settle, prisma } = setup();
    settle.mockRejectedValueOnce(new Error('database hiccup'));
    await expect(service.handle('STRIPE', Buffer.from(paid.body), paid.headers)).rejects.toThrow('database hiccup');
    expect(prisma.events.get('STRIPE:evt_1')).toMatchObject({ processedAt: null, error: 'database hiccup' });

    await expect(service.handle('STRIPE', Buffer.from(paid.body), paid.headers)).resolves.toEqual({ received: true, duplicate: false });
    expect(settle).toHaveBeenCalledTimes(2);
    expect(prisma.events.get('STRIPE:evt_1')).toMatchObject({ error: null });
  });

  it('rejects a bad signature without recording anything', async () => {
    const { service, prisma } = setup();
    await expect(service.handle('STRIPE', Buffer.from(paid.body), { 'x-fake-signature': 'nope' })).rejects.toThrow(BadRequestException);
    expect(prisma.events.size).toBe(0);
  });

  it('answers 404 for a provider that is not set up', async () => {
    const { service } = setup();
    await expect(service.handle('SQUARE', Buffer.from(paid.body), paid.headers)).rejects.toThrow(/not set up/);
  });
});
