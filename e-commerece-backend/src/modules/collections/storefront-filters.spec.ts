import { buildFilterWhere } from './storefront-filters.js';

const available = { isActive: true, stock: { gt: 0 } };

describe('buildFilterWhere', () => {
  it('returns an empty AND when no filters are used', () => {
    expect(buildFilterWhere({})).toEqual({ AND: [] });
  });

  it('builds every filter group, ORing values within a group', () => {
    const where = buildFilterWhere({
      categoryIds: ['c1', 'c2'],
      attributes: { fabric: ['chiffon', 'silk'], occasion: ['mehndi'], work: [] },
      sizes: ['S', 'm'],
      colours: ['Red'],
      price: { gte: 1000, lte: 50000 },
      onSale: true,
      readyToShip: true,
    });

    expect(where).toEqual({
      AND: [
        { categoryId: { in: ['c1', 'c2'] } },
        {
          attributes: {
            some: {
              attributeValue: { attribute: { slug: 'fabric' }, slug: { in: ['chiffon', 'silk'] } },
            },
          },
        },
        {
          attributes: {
            some: { attributeValue: { attribute: { slug: 'occasion' }, slug: { in: ['mehndi'] } } },
          },
        },
        {
          variants: {
            some: {
              ...available,
              OR: [
                { size: { equals: 'S', mode: 'insensitive' } },
                { size: { equals: 'm', mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          variants: {
            some: { ...available, OR: [{ colour: { equals: 'Red', mode: 'insensitive' } }] },
          },
        },
        { price: { gte: 1000, lte: 50000 } },
        { compareAtPrice: { not: null } },
        { isReadyToShip: true },
      ],
    });
  });

  it('supports a one-sided price range', () => {
    expect(buildFilterWhere({ price: { lte: 9900 } })).toEqual({
      AND: [{ price: { lte: 9900 } }],
    });
  });

  it('keeps an unknown category selection as a no-match filter', () => {
    expect(buildFilterWhere({ categoryIds: [] })).toEqual({ AND: [{ categoryId: { in: [] } }] });
  });

  it('ignores false yes/no filters', () => {
    expect(buildFilterWhere({ onSale: false, readyToShip: false })).toEqual({ AND: [] });
  });

  it('excludes one group for facet counts', () => {
    const filters = { sizes: ['S'], attributes: { fabric: ['silk'] }, onSale: true };
    expect(buildFilterWhere(filters, 'size').AND).toHaveLength(2);
    expect(buildFilterWhere(filters, 'attr:fabric')).toEqual({
      AND: [
        {
          variants: {
            some: { ...available, OR: [{ size: { equals: 'S', mode: 'insensitive' } }] },
          },
        },
        { compareAtPrice: { not: null } },
      ],
    });
  });
});
