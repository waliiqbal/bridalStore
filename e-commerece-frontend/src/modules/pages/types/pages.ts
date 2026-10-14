// These match the backend's admin page responses exactly.

export type SectionType =
  | "HERO_BANNER"
  | "COLLECTION_TILES"
  | "PRODUCT_CAROUSEL"
  | "COLLECTION_GRID"
  | "IMAGE_WITH_TEXT"
  | "RICH_TEXT"
  | "FAQ";

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
  sortOrder: number;
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
  settings?: Record<string, unknown> | null;
  isActive?: boolean;
}
