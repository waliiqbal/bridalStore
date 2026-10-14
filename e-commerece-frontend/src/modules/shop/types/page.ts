import type { ProductCardData } from "./shop";

// A page the owner built in the admin (homepage, About us, FAQs…), as the public API returns it.
// Blocks come with everything they show already filled in (their products, tiles, questions…).

export interface PublicFaq {
  id: string;
  question: string;
  answer: string;
}

export type SectionType =
  | "HERO_BANNER"
  | "COLLECTION_TILES"
  | "PRODUCT_CAROUSEL"
  | "COLLECTION_GRID"
  | "IMAGE_WITH_TEXT"
  | "RICH_TEXT"
  | "FAQ";

export interface PublicSection {
  id: string;
  type: SectionType;
  title: string | null;
  subtitle: string | null;
  body?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  buttonText?: string | null;
  // Layout choices from the admin: textAlign, textTone, mobileImageUrl, imageSide
  settings: Record<string, unknown> | null;
  // FAQ block
  faqs?: PublicFaq[];
  // Product slider / grid
  collection?: { title: string; slug: string };
  products?: ProductCardData[];
  // Collection tiles (the picture is the collection's banner)
  collections?: { title: string; slug: string; imageUrl: string | null; mobileImageUrl: string | null }[];
}

export interface PublicPage {
  title: string;
  slug: string;
  content: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
  currency: string;
  sections: PublicSection[];
}

// A promotional banner from the admin's Banners screen
export interface PublicBanner {
  id: string;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  buttonText: string | null;
  placement: string;
}
