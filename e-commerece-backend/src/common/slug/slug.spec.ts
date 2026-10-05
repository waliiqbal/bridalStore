import { BadRequestException, ConflictException } from '@nestjs/common';
import { pickUniqueSlug, resolveSlug, slugify } from './slug.js';

describe('slugify', () => {
  it('lowercases, hyphenates and trims', () => {
    expect(slugify('  Ivory Zardozi Bridal Lehenga ')).toBe('ivory-zardozi-bridal-lehenga');
    expect(slugify('Kurta & Jacket Sets')).toBe('kurta-and-jacket-sets');
    expect(slugify('Mehndi!!  Outfits -- 2026')).toBe('mehndi-outfits-2026');
  });

  it('strips accents', () => {
    expect(slugify('Café Crème')).toBe('cafe-creme');
  });

  it('returns an empty string when nothing usable remains', () => {
    expect(slugify('!!!')).toBe('');
  });

  it('caps length without a trailing hyphen', () => {
    const slug = slugify(`${'a'.repeat(99)} b`);
    expect(slug.length).toBeLessThanOrEqual(100);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('pickUniqueSlug', () => {
  it('keeps the base when free', () => {
    expect(pickUniqueSlug('lehenga', ['lehenga-set'])).toBe('lehenga');
  });

  it('appends -2, -3 on collision', () => {
    expect(pickUniqueSlug('lehenga', ['lehenga'])).toBe('lehenga-2');
    expect(pickUniqueSlug('lehenga', ['lehenga', 'lehenga-2', 'lehenga-3'])).toBe('lehenga-4');
  });

  it('fills the first gap', () => {
    expect(pickUniqueSlug('lehenga', ['lehenga', 'lehenga-3'])).toBe('lehenga-2');
  });
});

describe('resolveSlug', () => {
  it('generates from the source with a suffix on collision', async () => {
    const findTaken = vi.fn().mockResolvedValue(['bridal-edit']);
    await expect(
      resolveSlug({ source: 'Bridal Edit', entity: 'collection' }, findTaken),
    ).resolves.toBe('bridal-edit-2');
    expect(findTaken).toHaveBeenCalledWith('bridal-edit');
  });

  it('uses an explicit slug when free', async () => {
    const findTaken = vi.fn().mockResolvedValue(['eid-edit-2']);
    await expect(
      resolveSlug({ explicit: 'Eid Edit', source: 'x', entity: 'collection' }, findTaken),
    ).resolves.toBe('eid-edit');
  });

  it('rejects an explicit slug that is taken', async () => {
    const findTaken = vi.fn().mockResolvedValue(['eid-edit']);
    await expect(
      resolveSlug({ explicit: 'eid-edit', source: 'x', entity: 'collection' }, findTaken),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects an explicit slug with no usable characters', async () => {
    await expect(
      resolveSlug({ explicit: '###', source: 'x', entity: 'product' }, vi.fn()),
    ).rejects.toThrow(BadRequestException);
  });

  it('falls back to the entity name when the source has no usable characters', async () => {
    await expect(
      resolveSlug({ source: '!!!', entity: 'product' }, vi.fn().mockResolvedValue([])),
    ).resolves.toBe('product');
  });
});
