import type { Money } from "@/shared/lib/money";

// These match the backend's PUBLIC responses exactly (the ones the website reads).

export interface StoreSettings {
  storeName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  whatsappNumber: string | null;
  announcementBar: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  metaPixelId: string | null;
  googleAnalyticsId: string | null;
}

export interface PublicMenuItem {
  id: string;
  label: string;
  type: "COLLECTION" | "CATEGORY" | "PAGE" | "URL" | "HEADING";
  // null for group titles (they don't link anywhere)
  href: string | null;
  imageUrl: string | null;
  // "red" | "gold" | "dark" style hint
  highlight: string | null;
  children: PublicMenuItem[];
}

export interface PublicMenu {
  handle: string;
  name: string;
  items: PublicMenuItem[];
}

export interface CategoryTreeNode {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  showInMenu: boolean;
  children: CategoryTreeNode[];
}

export interface CurrencyOption {
  code: string;
  symbol: string;
  isDefault: boolean;
}

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  price: Money;
  compareAtPrice: Money | null;
  badge: string | null;
  isNewArrival: boolean;
  isReadyToShip: boolean;
  images: { url: string; altText: string | null }[];
  // Only sizes that are in stock
  sizes: string[];
  inStock: boolean;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type SortKey = "MANUAL" | "BEST_SELLING" | "NEWEST" | "PRICE_ASC" | "PRICE_DESC";

export interface OptionFacet {
  value: string;
  count: number;
  selected: boolean;
}

export interface Facets {
  categories: { name: string; slug: string; parentSlug: string | null; count: number; selected: boolean }[];
  attributes: {
    name: string;
    slug: string;
    values: { value: string; slug: string; count: number; selected: boolean }[];
  }[];
  sizes: OptionFacet[];
  colours: OptionFacet[];
  price: { min: Money; max: Money } | null;
  onSale: { count: number; selected: boolean };
  readyToShip: { count: number; selected: boolean };
}

export interface ListingResponse {
  currency: string;
  sort: SortKey;
  sortOptions: SortKey[];
  products: Paged<ProductCardData>;
  facets: Facets;
}

export interface CollectionPageData extends ListingResponse {
  collection: {
    id: string;
    title: string;
    slug: string;
    type: "MANUAL" | "SMART";
    defaultSort: SortKey;
    description: string | null;
    seoContent: string | null;
    noticeText: string | null;
    bannerImageUrl: string | null;
    mobileBannerImageUrl: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
  };
}

export interface CategoryPageData extends ListingResponse {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    breadcrumb: { name: string; slug: string }[];
    children: { name: string; slug: string }[];
  };
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  details: string | null;
  badge: string | null;
  tags: string[];
  isNewArrival: boolean;
  isReadyToShip: boolean;
  deliveryDays: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  price: Money;
  compareAtPrice: Money | null;
  images: { url: string; altText: string | null; colour: string | null }[];
  variants: {
    id: string;
    sku: string;
    size: string | null;
    colour: string | null;
    stock: number;
    inStock: boolean;
    price: Money;
  }[];
  sizes: string[];
  colours: string[];
  attributes: { name: string; slug: string; values: { value: string; slug: string }[] }[];
  sizeGuide: { name: string; content: string } | null;
  breadcrumb: { name: string; slug: string }[];
}
