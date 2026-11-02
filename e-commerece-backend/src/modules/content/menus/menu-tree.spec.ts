import {
  buildPublicMenu,
  menuImage,
  menuHref,
  normalizeMenuTarget,
  validateMenuTarget,
  type MenuItemRow,
} from './menu-tree.js';

const item = (overrides: Partial<MenuItemRow> & Pick<MenuItemRow, 'id' | 'type'>): MenuItemRow => ({
  parentId: null,
  label: overrides.id,
  url: null,
  imageUrl: null,
  highlight: null,
  collection: null,
  category: null,
  page: null,
  ...overrides,
});

describe('menuHref', () => {
  it('builds the storefront path for each type', () => {
    expect(
      menuHref(item({ id: 'a', type: 'COLLECTION', collection: { slug: 'eid-edit', isPublished: true } })),
    ).toBe('/collections/eid-edit');
    expect(
      menuHref(item({ id: 'b', type: 'CATEGORY', category: { slug: 'bridal', isVisible: true } })),
    ).toBe('/categories/bridal');
    expect(menuHref(item({ id: 'c', type: 'PAGE', page: { slug: 'about', isPublished: true } }))).toBe(
      '/pages/about',
    );
    expect(menuHref(item({ id: 'd', type: 'PAGE', page: { slug: 'home', isPublished: true } }))).toBe('/');
    expect(menuHref(item({ id: 'e', type: 'URL', url: 'https://instagram.com/x' }))).toBe(
      'https://instagram.com/x',
    );
    expect(menuHref(item({ id: 'f', type: 'HEADING' }))).toBeNull();
  });
});

describe('buildPublicMenu', () => {
  const rows: MenuItemRow[] = [
    item({ id: 'shop', type: 'HEADING' }),
    item({ id: 'eid', type: 'COLLECTION', parentId: 'shop', collection: { slug: 'eid', isPublished: true } }),
    item({ id: 'draft', type: 'COLLECTION', parentId: 'shop', collection: { slug: 'draft', isPublished: false } }),
    item({ id: 'hidden-cat', type: 'CATEGORY', category: { slug: 'secret', isVisible: false } }),
    item({ id: 'under-hidden', type: 'URL', parentId: 'hidden-cat', url: '/x' }),
    item({ id: 'empty-heading', type: 'HEADING' }),
    item({ id: 'only-hidden-child', type: 'HEADING' }),
    item({ id: 'unpub-page', type: 'PAGE', parentId: 'only-hidden-child', page: { slug: 'p', isPublished: false } }),
    item({ id: 'deleted-target', type: 'COLLECTION', collection: null }),
    item({ id: 'about', type: 'PAGE', page: { slug: 'about', isPublished: true } }),
  ];

  it('nests children, drops hidden targets with their subtree, and drops empty headings', () => {
    const menu = buildPublicMenu(rows);
    expect(menu.map((m) => m.id)).toEqual(['shop', 'about']);
    expect(menu[0]).toMatchObject({ href: null, children: [{ id: 'eid', href: '/collections/eid', children: [] }] });
    expect(menu[1].href).toBe('/pages/about');
  });
});

describe('validateMenuTarget', () => {
  it('requires the right target for each type', () => {
    expect(validateMenuTarget({ type: 'COLLECTION' })).toMatch(/collection/);
    expect(validateMenuTarget({ type: 'COLLECTION', collectionId: 'c' })).toBeNull();
    expect(validateMenuTarget({ type: 'CATEGORY', collectionId: 'c' })).toMatch(/category/);
    expect(validateMenuTarget({ type: 'PAGE', pageId: 'p' })).toBeNull();
    expect(validateMenuTarget({ type: 'URL', url: '/pages/about' })).toBeNull();
    expect(validateMenuTarget({ type: 'URL', url: 'javascript:alert(1)' })).toMatch(/Links must be/);
    expect(validateMenuTarget({ type: 'URL', url: '//evil.com' })).toMatch(/Links must be/);
    expect(validateMenuTarget({ type: 'HEADING' })).toBeNull();
    expect(validateMenuTarget({ type: 'HEADING', url: '/x' })).toMatch(/cannot link/);
  });

  it('clears targets that do not belong to the type', () => {
    expect(normalizeMenuTarget({ type: 'PAGE', pageId: 'p', collectionId: 'c', url: '/x' })).toEqual({
      collectionId: null,
      categoryId: null,
      pageId: 'p',
      url: null,
    });
  });
});

describe('menuImage', () => {
  it("uses the item's own picture first", () => {
    const row = item({
      id: 'a',
      type: 'CATEGORY',
      imageUrl: 'own.webp',
      category: { slug: 'x', isVisible: true, tileImageUrl: 'tile.webp', imageUrl: 'banner.webp' },
    });
    expect(menuImage(row)).toBe('own.webp');
  });

  it("falls back to the category's tile picture, then its banner", () => {
    const withTile = item({
      id: 'a',
      type: 'CATEGORY',
      category: { slug: 'x', isVisible: true, tileImageUrl: 'tile.webp', imageUrl: 'banner.webp' },
    });
    const bannerOnly = item({
      id: 'b',
      type: 'CATEGORY',
      category: { slug: 'x', isVisible: true, tileImageUrl: null, imageUrl: 'banner.webp' },
    });
    expect(menuImage(withTile)).toBe('tile.webp');
    expect(menuImage(bannerOnly)).toBe('banner.webp');
  });

  it("falls back through a collection's tile, phone banner and banner", () => {
    const collection = (extra: object) =>
      item({ id: 'c', type: 'COLLECTION', collection: { slug: 'x', isPublished: true, ...extra } });
    expect(menuImage(collection({ tileImageUrl: 't', mobileBannerImageUrl: 'm', bannerImageUrl: 'b' }))).toBe('t');
    expect(menuImage(collection({ mobileBannerImageUrl: 'm', bannerImageUrl: 'b' }))).toBe('m');
    expect(menuImage(collection({ bannerImageUrl: 'b' }))).toBe('b');
  });

  it('has no picture for headings, pages and links, and the public menu uses it', () => {
    expect(menuImage(item({ id: 'h', type: 'HEADING' }))).toBeNull();
    expect(menuImage(item({ id: 'u', type: 'URL', url: '/x' }))).toBeNull();
    const menu = buildPublicMenu([
      item({ id: 'k', type: 'CATEGORY', category: { slug: 'k', isVisible: true, tileImageUrl: 'k.webp' } }),
    ]);
    expect(menu[0].imageUrl).toBe('k.webp');
  });
});

describe('TEXT items (plain words, used in footer columns)', () => {
  it('have no link, are always shown and cannot be given a target', () => {
    const text = item({ id: 't', type: 'TEXT', label: 'Planning a celebration?' });
    expect(menuHref(text)).toBeNull();
    expect(validateMenuTarget({ type: 'TEXT' })).toBeNull();
    expect(validateMenuTarget({ type: 'TEXT', url: '/x' })).toMatch(/cannot link/);
    const menu = buildPublicMenu([
      item({ id: 'col', type: 'HEADING' }),
      item({ id: 't', type: 'TEXT', parentId: 'col', label: 'Hello' }),
    ]);
    expect(menu[0].children).toMatchObject([{ id: 't', type: 'TEXT', label: 'Hello', href: null }]);
  });
});
