import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation.js';
import { RevalidationService } from './revalidation.service.js';

const config = (values: Partial<Env>) =>
  ({ get: (key: keyof Env) => values[key] }) as unknown as ConfigService<Env, true>;

describe('RevalidationService', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const enabled = () =>
    new RevalidationService(
      config({ FRONTEND_REVALIDATE_URL: 'http://shop.test/api/revalidate', REVALIDATE_SECRET: 's'.repeat(32) }),
    );

  it('posts unique, non-empty tags with the shared secret', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await enabled().notify(['product:a', 'products', 'product:a', undefined, '']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://shop.test/api/revalidate');
    expect(init.method).toBe('POST');
    expect(init.headers['x-revalidate-secret']).toBe('s'.repeat(32));
    expect(JSON.parse(init.body)).toEqual({ tags: ['product:a', 'products'] });
  });

  it('does nothing when no URL is configured', async () => {
    await new RevalidationService(config({})).notify(['settings']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never rejects when the storefront is down or returns an error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(enabled().notify(['settings'])).resolves.toBeUndefined();

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(enabled().notify(['settings'])).resolves.toBeUndefined();
  });
});
