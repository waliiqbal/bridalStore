import { describe, expect, it } from 'vitest';
import { buildMetaFeed, csvCell, type FeedProduct } from './meta-feed.js';

const opts = { siteUrl: 'https://shop.example.com', brand: 'Malikah' };

const product: FeedProduct = {
  name: 'Ruby, "Red" Lehenga',
  slug: 'ruby-red-lehenga',
  description: '<p>Hand   embroidered</p>',
  price: 120000,
  compareAtPrice: 150000,
  images: [
    { url: 'https://img/1.webp', colour: null },
    { url: 'https://img/2-green.webp', colour: 'Green' },
  ],
  variants: [
    { sku: 'RR-S-RED', size: 'S', colour: 'Red', price: null, stock: 2 },
    { sku: 'RR-M-GREEN', size: 'M', colour: 'Green', price: 130000, stock: 0 },
  ],
};

describe('csvCell', () => {
  it('quotes values with commas and doubles inner quotes', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('plain')).toBe('plain');
  });
});

describe('buildMetaFeed', () => {
  const lines = buildMetaFeed([product], opts).trim().split('\n');

  it('has a header and one row per variant', () => {
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('item_group_id');
  });

  it('shows the crossed-out price as price and the charged price as sale_price', () => {
    expect(lines[1]).toContain('1500.00 AUD,1200.00 AUD');
  });

  it('uses the variant price and stock', () => {
    expect(lines[2]).toContain('RR-M-GREEN');
    expect(lines[2]).toContain('out of stock');
    expect(lines[2]).toContain('1500.00 AUD,1300.00 AUD');
  });

  it('puts a picture of the same colour first and strips HTML from the description', () => {
    expect(lines[2]).toContain('https://img/2-green.webp,https://img/1.webp');
    expect(lines[1]).toContain('Hand embroidered');
    expect(lines[1]).not.toContain('<p>');
  });

  it('links to the product page and escapes the title', () => {
    expect(lines[1]).toContain('https://shop.example.com/products/ruby-red-lehenga');
    expect(lines[1]).toContain('"Ruby, ""Red"" Lehenga"');
  });

  it('has no sale price when nothing is crossed out, and skips products without pictures', () => {
    const plain = buildMetaFeed(
      [
        { ...product, compareAtPrice: null },
        { ...product, images: [] },
      ],
      opts,
    )
      .trim()
      .split('\n');
    expect(plain).toHaveLength(3);
    expect(plain[1]).toContain('1200.00 AUD,,https');
  });
});
