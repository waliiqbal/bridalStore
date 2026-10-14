import { beforeEach, describe, expect, it, vi } from 'vitest';

type Callback = (error: { message: string } | undefined, result?: { secure_url?: string }) => void;

const state = vi.hoisted(() => ({
  options: undefined as Record<string, unknown> | undefined,
  uploaded: undefined as Buffer | undefined,
  reply: undefined as { error?: { message: string }; result?: { secure_url?: string } } | undefined,
  config: vi.fn(),
}));

vi.mock('cloudinary', () => ({
  v2: {
    config: state.config,
    uploader: {
      upload_stream: (options: Record<string, unknown>, done: Callback) => {
        state.options = options;
        return {
          end: (buffer: Buffer) => {
            state.uploaded = buffer;
            done(state.reply?.error, state.reply?.result);
          },
        };
      },
    },
  },
}));

import { CloudinaryStorage } from './cloudinary.storage.js';

const config = { cloudName: 'demo', apiKey: 'key', apiSecret: 'secret' };

describe('CloudinaryStorage', () => {
  beforeEach(() => {
    state.options = undefined;
    state.uploaded = undefined;
    state.reply = { result: { secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/images/2026/10/a.webp' } };
    state.config.mockClear();
  });

  it('configures the SDK with the account details over https', () => {
    new CloudinaryStorage(config);
    expect(state.config).toHaveBeenCalledWith({
      cloud_name: 'demo',
      api_key: 'key',
      api_secret: 'secret',
      secure: true,
    });
  });

  it('uploads the bytes and returns only the https URL Cloudinary gives back', async () => {
    const body = Buffer.from('image-bytes');
    const url = await new CloudinaryStorage(config).save('images/2026/10/a.webp', body);

    expect(url).toBe('https://res.cloudinary.com/demo/image/upload/v1/images/2026/10/a.webp');
    expect(state.uploaded).toBe(body);
  });

  it('uses the key without its extension as the public id and never overwrites', async () => {
    await new CloudinaryStorage(config).save('images/2026/10/a.webp', Buffer.from('x'));
    expect(state.options).toMatchObject({
      public_id: 'images/2026/10/a',
      resource_type: 'image',
      overwrite: false,
      unique_filename: false,
    });
  });

  it('turns a Cloudinary error into a normal Error', async () => {
    state.reply = { error: { message: 'Invalid API key' } };
    await expect(new CloudinaryStorage(config).save('images/a.webp', Buffer.from('x'))).rejects.toThrow(
      'Cloudinary upload failed: Invalid API key',
    );
  });

  it('fails when no URL comes back', async () => {
    state.reply = { result: {} };
    await expect(new CloudinaryStorage(config).save('images/a.webp', Buffer.from('x'))).rejects.toThrow(
      /no URL returned/,
    );
  });

  it('rejects unsafe keys before uploading anything', async () => {
    await expect(new CloudinaryStorage(config).save('../evil.webp', Buffer.from('x'))).rejects.toThrow(
      /Unsafe storage key/,
    );
    expect(state.uploaded).toBeUndefined();
  });
});
