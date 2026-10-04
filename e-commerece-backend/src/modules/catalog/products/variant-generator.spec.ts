import {
  normalizeOptions,
  planVariants,
  productSkuCode,
  skuFor,
} from './variant-generator.js';

describe('normalizeOptions', () => {
  it('trims, drops blanks and de-duplicates case-insensitively', () => {
    expect(normalizeOptions([' S ', 's', 'M', '', '  ', 'Light  Pink'])).toEqual([
      'S',
      'M',
      'Light Pink',
    ]);
  });
});

describe('SKUs', () => {
  it('builds a product code from slug initials and the id tail', () => {
    expect(productSkuCode('ivory-zardozi-bridal-lehenga', 'cm123abc7qx')).toBe('IZB7QX');
  });

  it('builds readable SKUs and skips missing parts', () => {
    expect(skuFor('IZB7QX', 'Ivory', 'XL')).toBe('MBS-IZB7QX-IVO-XL');
    expect(skuFor('IZB7QX', null, '40')).toBe('MBS-IZB7QX-40');
    expect(skuFor('IZB7QX', 'Light Pink', null)).toBe('MBS-IZB7QX-LIG');
  });
});

describe('planVariants', () => {
  const base = { code: 'ABC123', existing: [], takenSkus: [] };

  it('creates every size × colour combination', () => {
    const planned = planVariants({ ...base, sizes: ['S', 'M'], colours: ['Red', 'Blue'] });
    expect(planned.map((p) => [p.colour, p.size])).toEqual([
      ['Red', 'S'],
      ['Red', 'M'],
      ['Blue', 'S'],
      ['Blue', 'M'],
    ]);
    expect(new Set(planned.map((p) => p.sku)).size).toBe(4);
  });

  it('creates only the missing combinations (case-insensitive)', () => {
    const planned = planVariants({
      ...base,
      sizes: ['S', 'M'],
      colours: ['Red'],
      existing: [{ size: 's', colour: 'RED' }],
    });
    expect(planned).toEqual([{ size: 'M', colour: 'Red', sku: 'MBS-ABC123-RED-M' }]);
  });

  it('supports sizes only or colours only', () => {
    expect(planVariants({ ...base, sizes: ['38', '40'], colours: [] })).toEqual([
      { size: '38', colour: null, sku: 'MBS-ABC123-38' },
      { size: '40', colour: null, sku: 'MBS-ABC123-40' },
    ]);
    expect(planVariants({ ...base, sizes: [], colours: ['Mint'] })).toEqual([
      { size: null, colour: 'Mint', sku: 'MBS-ABC123-MIN' },
    ]);
  });

  it('returns nothing when no sizes or colours are given', () => {
    expect(planVariants({ ...base, sizes: [], colours: [] })).toEqual([]);
  });

  it('suffixes SKUs that are already taken, including within one run', () => {
    // "Mint" and "Mint Green" both abbreviate to MIN
    const planned = planVariants({
      ...base,
      sizes: ['S'],
      colours: ['Mint', 'Mint Green'],
      takenSkus: ['MBS-ABC123-MIN-S'],
    });
    expect(planned.map((p) => p.sku)).toEqual(['MBS-ABC123-MIN-S-2', 'MBS-ABC123-MIN-S-3']);
  });
});
