import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { processImage, UnsupportedImageError } from './image-processor.js';
import { LocalStorage } from './storage/local.storage.js';
import { assertSafeKey, publicUrlFor } from './storage/storage.js';
import { storageKey, UploadsService } from './uploads.service.js';

const solid = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#c08497' } });

describe('processImage', () => {
  it('resizes the longest side to 2400px and converts to WebP', async () => {
    const jpeg = await solid(3000, 1000).jpeg().toBuffer();
    const result = await processImage(jpeg);
    expect(result).toMatchObject({ width: 2400, height: 800, contentType: 'image/webp' });
    expect((await sharp(result.buffer).metadata()).format).toBe('webp');
  });

  it('never enlarges small images', async () => {
    const png = await solid(800, 600).png().toBuffer();
    expect(await processImage(png)).toMatchObject({ width: 800, height: 600 });
  });

  it('auto-rotates from EXIF and strips EXIF/GPS metadata', async () => {
    // Stored landscape with "rotate 90°" orientation → displays portrait
    const jpeg = await solid(1200, 600)
      .jpeg()
      .withMetadata({
        orientation: 6,
        exif: { IFD0: { Make: 'PhoneCam', Model: 'X1' }, IFD3: { GPSLatitudeRef: 'S' } },
      })
      .toBuffer();
    expect((await sharp(jpeg).metadata()).exif).toBeDefined();

    const result = await processImage(jpeg);
    expect(result).toMatchObject({ width: 600, height: 1200 });
    const meta = await sharp(result.buffer).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
  });

  it('accepts WebP and AVIF', async () => {
    await expect(processImage(await solid(50, 50).webp().toBuffer())).resolves.toBeDefined();
    await expect(processImage(await solid(50, 50).avif().toBuffer())).resolves.toBeDefined();
  });

  it('rejects other image types and non-images, whatever the file is called', async () => {
    const gif = await solid(50, 50).gif().toBuffer();
    await expect(processImage(gif)).rejects.toThrow(/GIF file/);
    await expect(processImage(Buffer.from('<?php echo 1; ?>'))).rejects.toThrow(
      UnsupportedImageError,
    );
  });
});

describe('storage', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mbs-uploads-'));
  });
  afterEach(async () => rm(dir, { recursive: true, force: true }));

  it('builds dated, unique WebP keys', () => {
    const key = storageKey(new Date('2026-03-09T00:00:00Z'));
    expect(key).toMatch(/^images\/2026\/03\/[0-9a-f-]{36}\.webp$/);
    expect(storageKey()).not.toBe(storageKey());
  });

  it('joins public URLs without double slashes', () => {
    expect(publicUrlFor('https://cdn.example.com/', '/images/a.webp')).toBe(
      'https://cdn.example.com/images/a.webp',
    );
  });

  it('rejects unsafe keys', () => {
    expect(() => assertSafeKey('../etc/passwd')).toThrow();
    expect(() => assertSafeKey('images/../../x.webp')).toThrow();
    expect(() => assertSafeKey('/abs/x.webp')).toThrow();
    expect(() => assertSafeKey('images/2026/01/a.webp')).not.toThrow();
  });

  it('local driver writes the file and returns its public URL', async () => {
    const storage = new LocalStorage(dir, 'http://localhost:3000/uploads');
    const url = await storage.save('images/2026/01/a.webp', Buffer.from('data'));
    expect(url).toBe('http://localhost:3000/uploads/images/2026/01/a.webp');
    expect(await readFile(join(dir, 'images/2026/01/a.webp'), 'utf8')).toBe('data');
    // Never overwrites an existing file
    await expect(storage.save('images/2026/01/a.webp', Buffer.from('x'))).rejects.toThrow();
  });

  it('UploadsService rejects the whole batch if any file is invalid, saving nothing', async () => {
    const save = vi.fn().mockResolvedValue('http://x/a.webp');
    const service = new UploadsService({ save });
    const good = await solid(10, 10).png().toBuffer();

    await expect(
      service.uploadImages([
        { originalname: 'good.png', buffer: good },
        { originalname: 'fake.png', buffer: Buffer.from('not an image') },
      ]),
    ).rejects.toThrow(new BadRequestException('"fake.png" is not a valid image'));
    expect(save).not.toHaveBeenCalled();
    await expect(service.uploadImages([])).rejects.toThrow(/at least one image/);
  });
});
