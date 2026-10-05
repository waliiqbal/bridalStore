import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { CurrencyService } from './currency.service.js';

describe('CurrencyService.resolve', () => {
  const findUnique = vi.fn();
  const service = new CurrencyService({
    currency: { findUnique },
  } as unknown as PrismaService);

  beforeEach(() => findUnique.mockReset());

  it('uses AUD without a query when no currency or AUD is requested', async () => {
    expect((await service.resolve()).code).toBe('AUD');
    expect((await service.resolve('aud')).code).toBe('AUD');
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('converts with an enabled currency', async () => {
    findUnique.mockResolvedValue({
      code: 'USD',
      rateFromAud: new Prisma.Decimal('0.65'),
      roundTo: 100,
      isEnabled: true,
    });
    const ctx = await service.resolve('usd');
    expect(ctx.convert(249900)).toEqual({ amount: 162500, currencyCode: 'USD' });
  });

  it('falls back to AUD for unknown currencies', async () => {
    findUnique.mockResolvedValue(null);
    const ctx = await service.resolve('XYZ');
    expect(ctx.convert(24999)).toEqual({ amount: 24999, currencyCode: 'AUD' });
  });

  it('falls back to AUD for disabled currencies', async () => {
    findUnique.mockResolvedValue({
      code: 'GBP',
      rateFromAud: new Prisma.Decimal('0.52'),
      roundTo: 100,
      isEnabled: false,
    });
    expect((await service.resolve('GBP')).code).toBe('AUD');
  });

  it('falls back to AUD for malformed codes without querying', async () => {
    expect((await service.resolve('US DOLLARS')).code).toBe('AUD');
    expect(findUnique).not.toHaveBeenCalled();
  });
});
