import { BadRequestException, ConflictException } from '@nestjs/common';

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '');
}

// "lehenga" taken → "lehenga-2", then "lehenga-3", ...
export function pickUniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

// Returns slugs that start with `prefix` (excluding the record being edited).
export type FindTakenSlugs = (prefix: string) => Promise<string[]>;

/**
 * Explicit slug from the admin: must be free, otherwise 409.
 * No explicit slug: generated from `source`, with -2, -3... on collision.
 */
export async function resolveSlug(
  opts: { explicit?: string | null; source: string; entity: string },
  findTaken: FindTakenSlugs,
): Promise<string> {
  if (opts.explicit != null) {
    const slug = slugify(opts.explicit);
    if (!slug) {
      throw new BadRequestException('The URL must contain letters or numbers');
    }
    const taken = await findTaken(slug);
    if (taken.includes(slug)) {
      throw new ConflictException(
        `The URL "${slug}" is already used by another ${opts.entity}. Please choose a different one.`,
      );
    }
    return slug;
  }

  const base = slugify(opts.source) || opts.entity.replace(/\s+/g, '-');
  return pickUniqueSlug(base, await findTaken(base));
}
