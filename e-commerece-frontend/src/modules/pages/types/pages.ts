// These match the backend's admin page responses exactly.

export type SectionType =
  | "HERO_BANNER"
  | "COLLECTION_TILES"
  | "PRODUCT_CAROUSEL"
  | "COLLECTION_GRID"
  | "IMAGE_WITH_TEXT"
  | "RICH_TEXT"
  | "FAQ"
  | "VIDEO_SHOWCASE"
  | "VIDEO_BANNER"
  | "PROMO_BANNERS";

export interface PageListItem {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  showInFooter: boolean;
  updatedAt: string;
  _count: { sections: number };
}

export interface PageSection {
  id: string;
  type: SectionType;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  buttonText: string | null;
  collectionId: string | null;
  collectionIds: string[];
  productLimit: number;
  // Extra layout options (see lib/sections.ts for the keys we use)
  settings: Record<string, unknown> | null;
  // Banner video / Trending videos blocks: the block's own videos, in order
  videos: SectionVideo[];
  // Side-by-side banners block: the block's own banners, in order
  banners: SectionBanner[];
  sortOrder: number;
  isActive: boolean;
}

// One video inside a Banner video or Trending videos block
export interface SectionVideo {
  title: string | null;
  videoUrl: string;
  posterUrl: string | null;
  linkUrl: string | null;
  isActive: boolean;
}

// One banner inside a "Side-by-side banners" block
export interface SectionBanner {
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  buttonText: string | null;
  isActive: boolean;
}

export interface AdminPage {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  isPublished: boolean;
  showInFooter: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
  sections: PageSection[];
}

export interface PageInput {
  title?: string;
  slug?: string;
  content?: string | null;
  isPublished?: boolean;
  showInFooter?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface SectionInput {
  type?: SectionType;
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  buttonText?: string | null;
  collectionId?: string | null;
  collectionIds?: string[];
  productLimit?: number;
  // Sent with a video block: replaces the block's videos
  videos?: SectionVideo[];
  // Sent with a side-by-side banners block: replaces the block's banners
  banners?: SectionBanner[];
  settings?: Record<string, unknown> | null;
  isActive?: boolean;
}
