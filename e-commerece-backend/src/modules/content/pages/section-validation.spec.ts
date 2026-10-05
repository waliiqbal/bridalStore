import { referencedCollectionIds, validateSection } from './section-validation.js';

describe('validateSection', () => {
  it('requires a collection for product grids and carousels', () => {
    expect(validateSection({ type: 'PRODUCT_CAROUSEL' })).toEqual([
      'Product carousel sections need a collection to show products from',
    ]);
    expect(validateSection({ type: 'COLLECTION_GRID', collectionId: null })).toHaveLength(1);
    expect(validateSection({ type: 'COLLECTION_GRID', collectionId: 'c1' })).toEqual([]);
  });

  it('requires 1–12 collections for tiles', () => {
    expect(validateSection({ type: 'COLLECTION_TILES', collectionIds: [] })).toEqual([
      'Collection tiles sections need at least one collection',
    ]);
    const thirteen = Array.from({ length: 13 }, (_, i) => `c${i}`);
    expect(validateSection({ type: 'COLLECTION_TILES', collectionIds: thirteen })).toEqual([
      'Collection tiles sections can show at most 12 collections',
    ]);
    expect(validateSection({ type: 'COLLECTION_TILES', collectionIds: ['c1'] })).toEqual([]);
  });

  it('requires an image for hero banners and image-with-text', () => {
    expect(validateSection({ type: 'HERO_BANNER' })).toEqual(['Hero banner sections need an image']);
    expect(validateSection({ type: 'IMAGE_WITH_TEXT', imageUrl: '' })).toEqual([
      'Image with text sections need an image',
    ]);
    expect(validateSection({ type: 'HERO_BANNER', imageUrl: 'https://x/a.webp' })).toEqual([]);
  });

  it('requires text for rich text sections; FAQ needs nothing', () => {
    expect(validateSection({ type: 'RICH_TEXT', body: '   ' })).toEqual(['Text sections need some text']);
    expect(validateSection({ type: 'RICH_TEXT', body: '<p>Hi</p>' })).toEqual([]);
    expect(validateSection({ type: 'FAQ' })).toEqual([]);
  });

  it('limits the number of products to 1–24', () => {
    const base = { type: 'PRODUCT_CAROUSEL' as const, collectionId: 'c1' };
    expect(validateSection({ ...base, productLimit: 0 })).toHaveLength(1);
    expect(validateSection({ ...base, productLimit: 25 })).toHaveLength(1);
    expect(validateSection({ ...base, productLimit: 24 })).toEqual([]);
  });

  it('collects every problem at once', () => {
    expect(validateSection({ type: 'COLLECTION_GRID', productLimit: 99 })).toHaveLength(2);
  });
});

describe('referencedCollectionIds', () => {
  it('returns the collections a section uses', () => {
    expect(referencedCollectionIds({ type: 'PRODUCT_CAROUSEL', collectionId: 'c1' })).toEqual(['c1']);
    expect(referencedCollectionIds({ type: 'COLLECTION_TILES', collectionIds: ['a', 'b'] })).toEqual([
      'a',
      'b',
    ]);
    // Leftover ids on other section types are ignored
    expect(referencedCollectionIds({ type: 'HERO_BANNER', collectionId: 'c1' })).toEqual([]);
  });
});
