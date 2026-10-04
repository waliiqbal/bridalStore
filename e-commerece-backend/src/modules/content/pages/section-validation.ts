import type { PageSectionType } from '../../../generated/prisma/enums.js';

export const PRODUCT_SECTION_TYPES: PageSectionType[] = ['COLLECTION_GRID', 'PRODUCT_CAROUSEL'];
// Bounds the work (and queries) needed to render one page
export const MAX_PRODUCT_SECTIONS_PER_PAGE = 12;
export const MAX_TILES = 12;
export const MAX_PRODUCT_LIMIT = 24;

export interface SectionShape {
  type: PageSectionType;
  body?: string | null;
  imageUrl?: string | null;
  collectionId?: string | null;
  collectionIds?: string[];
  productLimit?: number;
}

const LABELS: Record<PageSectionType, string> = {
  RICH_TEXT: 'Text',
  HERO_BANNER: 'Hero banner',
  COLLECTION_GRID: 'Product grid',
  PRODUCT_CAROUSEL: 'Product carousel',
  COLLECTION_TILES: 'Collection tiles',
  IMAGE_WITH_TEXT: 'Image with text',
  FAQ: 'FAQ',
};

export const isProductSection = (type: PageSectionType) => PRODUCT_SECTION_TYPES.includes(type);

/**
 * Checks that a section has what its type needs. Whether the referenced
 * collections exist is checked separately by the service (one query).
 * Returns plain-language errors; empty array = valid.
 */
export function validateSection(section: SectionShape): string[] {
  const label = LABELS[section.type];
  const errors: string[] = [];

  switch (section.type) {
    case 'COLLECTION_GRID':
    case 'PRODUCT_CAROUSEL':
      if (!section.collectionId) errors.push(`${label} sections need a collection to show products from`);
      break;
    case 'COLLECTION_TILES':
      if (!section.collectionIds?.length) {
        errors.push(`${label} sections need at least one collection`);
      } else if (section.collectionIds.length > MAX_TILES) {
        errors.push(`${label} sections can show at most ${MAX_TILES} collections`);
      }
      break;
    case 'HERO_BANNER':
    case 'IMAGE_WITH_TEXT':
      if (!section.imageUrl) errors.push(`${label} sections need an image`);
      break;
    case 'RICH_TEXT':
      if (!section.body?.trim()) errors.push(`${label} sections need some text`);
      break;
    case 'FAQ':
      break;
  }

  if (
    section.productLimit !== undefined &&
    (!Number.isInteger(section.productLimit) || section.productLimit < 1 || section.productLimit > MAX_PRODUCT_LIMIT)
  ) {
    errors.push(`Number of products must be between 1 and ${MAX_PRODUCT_LIMIT}`);
  }
  return errors;
}

// Collections a section points at (for the existence check and page rendering)
export function referencedCollectionIds(section: SectionShape): string[] {
  if (isProductSection(section.type)) return section.collectionId ? [section.collectionId] : [];
  if (section.type === 'COLLECTION_TILES') return section.collectionIds ?? [];
  return [];
}
