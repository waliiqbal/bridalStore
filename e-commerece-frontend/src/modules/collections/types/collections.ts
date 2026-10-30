import type { ProductStatus } from "@/modules/catalog/types/catalog";
import type { Money } from "@/shared/lib/money";

// These match the backend's admin collection responses exactly.

export type CollectionType = "MANUAL" | "SMART";
export type CollectionSort = "MANUAL" | "BEST_SELLING" | "NEWEST" | "PRICE_ASC" | "PRICE_DESC";

export type RuleField =
  | "CATEGORY"
  | "ATTRIBUTE"
  | "TAG"
  | "COLOUR"
  | "SIZE"
  | "PRICE"
  | "ON_SALE"
  | "NEW_ARRIVAL"
  | "READY_TO_SHIP"
  | "CREATED_WITHIN_DAYS";

export type RuleOperator = "EQUALS" | "NOT_EQUALS" | "LESS_THAN" | "GREATER_THAN";

export interface CollectionListItem {
  id: string;
  title: string;
  slug: string;
  type: CollectionType;
  isPublished: boolean;
  updatedAt: string;
  _count: { products: number; rules: number };
}

export interface CollectionRule {
  field: RuleField;
  operator: RuleOperator;
  // category id, filter-option id, text, price in cents, or days (as text); "" for yes/no rules
  value: string;
}

export interface CollectionProductItem {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  price: Money;
  sortOrder?: number;
  imageUrl: string | null;
}

export interface AdminCollection {
  id: string;
  title: string;
  slug: string;
  type: CollectionType;
  matchAllRules: boolean;
  defaultSort: CollectionSort;
  description: string | null;
  seoContent: string | null;
  bannerImageUrl: string | null;
  mobileBannerImageUrl: string | null;
  tileImageUrl: string | null;
  noticeText: string | null;
  filterAttributeIds: string[];
  isPublished: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
  rules: (CollectionRule & { id: string })[];
  products: CollectionProductItem[];
}

export interface CollectionInput {
  title?: string;
  slug?: string;
  type?: CollectionType;
  matchAllRules?: boolean;
  rules?: CollectionRule[];
  defaultSort?: CollectionSort;
  description?: string | null;
  seoContent?: string | null;
  bannerImageUrl?: string | null;
  mobileBannerImageUrl?: string | null;
  tileImageUrl?: string | null;
  noticeText?: string | null;
  filterAttributeIds?: string[];
  isPublished?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

// One product card as returned by the preview
export interface PreviewCard {
  id: string;
  name: string;
  slug: string;
  price: Money;
  compareAtPrice: Money | null;
  images: { url: string; altText: string | null }[];
  inStock: boolean;
}

export interface PreviewResult {
  items: PreviewCard[];
  total: number;
  page: number;
  pageSize: number;
}
