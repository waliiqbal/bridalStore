export interface VariantOption {
  size: string | null;
  colour: string | null;
}

export interface PlannedVariant extends VariantOption {
  sku: string;
}

const optionKey = (o: VariantOption) =>
  `${o.colour?.toLowerCase() ?? ''}|${o.size?.toLowerCase() ?? ''}`;

const alnumUpper = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

// Trim, drop blanks, de-duplicate case-insensitively (first spelling wins).
export function normalizeOptions(values: string[] = []): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = raw.trim().replace(/\s+/g, ' ');
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

// Initials of the first 3 slug words + last 3 id characters, e.g. "IZB7QX".
// The id part keeps codes distinct between products with similar names.
export function productSkuCode(slug: string, id: string): string {
  const initials = slug
    .split('-')
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0])
    .join('');
  return alnumUpper(initials + id.slice(-3)) || 'P';
}

export function skuFor(code: string, colour: string | null, size: string | null): string {
  const parts = ['MBS', code];
  const colourPart = colour ? alnumUpper(colour).slice(0, 3) : '';
  const sizePart = size ? alnumUpper(size).slice(0, 6) : '';
  if (colourPart) parts.push(colourPart);
  if (sizePart) parts.push(sizePart);
  return parts.join('-');
}

/**
 * Every size × colour combination that doesn't exist yet, with a unique SKU.
 * Only sizes or only colours is allowed (the other side stays null).
 */
export function planVariants(input: {
  code: string;
  sizes: string[];
  colours: string[];
  existing: VariantOption[];
  takenSkus: Iterable<string>;
}): PlannedVariant[] {
  const sizes = normalizeOptions(input.sizes);
  const colours = normalizeOptions(input.colours);
  if (sizes.length === 0 && colours.length === 0) return [];

  const existingKeys = new Set(input.existing.map(optionKey));
  const takenSkus = new Set(input.takenSkus);
  const planned: PlannedVariant[] = [];

  for (const colour of colours.length ? colours : [null]) {
    for (const size of sizes.length ? sizes : [null]) {
      const option = { size, colour };
      if (existingKeys.has(optionKey(option))) continue;

      const base = skuFor(input.code, colour, size);
      let sku = base;
      for (let n = 2; takenSkus.has(sku); n++) sku = `${base}-${n}`;
      takenSkus.add(sku);
      planned.push({ ...option, sku });
    }
  }
  return planned;
}
