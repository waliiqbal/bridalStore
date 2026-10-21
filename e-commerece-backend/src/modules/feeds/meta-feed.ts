// Builds the product catalogue file that Facebook / Instagram Shopping reads (CSV).
// One row per size/colour, grouped by `item_group_id`. Prices are in AUD (the shop's own currency).

export interface FeedProduct {
  name: string;
  slug: string;
  description: string | null;
  // AUD cents
  price: number;
  compareAtPrice: number | null;
  images: { url: string; colour: string | null }[];
  variants: {
    sku: string;
    size: string | null;
    colour: string | null;
    price: number | null;
    stock: number;
  }[];
}

export const META_FEED_COLUMNS = [
  'id',
  'item_group_id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'sale_price',
  'link',
  'image_link',
  'additional_image_link',
  'brand',
  'color',
  'size',
] as const;

// Quotes a value when it contains a comma, quote or line break
export function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const aud = (cents: number) => `${(cents / 100).toFixed(2)} AUD`;

// Meta rejects HTML and very long text
function plainText(html: string | null, fallback: string): string {
  const text = (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (text || fallback).slice(0, 5000);
}

export function buildMetaFeed(products: FeedProduct[], opts: { siteUrl: string; brand: string }): string {
  const rows: string[] = [META_FEED_COLUMNS.join(',')];
  for (const product of products) {
    const link = `${opts.siteUrl}/products/${product.slug}`;
    const description = plainText(product.description, product.name);
    for (const variant of product.variants) {
      // A picture of this colour if there is one, otherwise the first picture
      const own = product.images.filter((i) => i.colour && i.colour === variant.colour);
      const ordered = [...own, ...product.images.filter((i) => !own.includes(i))];
      if (ordered.length === 0) continue; // Meta needs a picture
      const current = variant.price ?? product.price;
      // "On sale" = the crossed-out price is higher than what is charged
      const onSale = product.compareAtPrice !== null && product.compareAtPrice > current;
      rows.push(
        [
          variant.sku,
          product.slug,
          product.name,
          description,
          variant.stock > 0 ? 'in stock' : 'out of stock',
          'new',
          aud(onSale ? product.compareAtPrice! : current),
          onSale ? aud(current) : '',
          link,
          ordered[0]!.url,
          ordered
            .slice(1, 11)
            .map((i) => i.url)
            .join(','),
          opts.brand,
          variant.colour ?? '',
          variant.size ?? '',
        ]
          .map(csvCell)
          .join(','),
      );
    }
  }
  return rows.join('\n') + '\n';
}
