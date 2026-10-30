import type { Money } from "@/shared/lib/money";

// These match the backend's admin catalog responses exactly.

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  updatedAt: string;
  price: Money;
  compareAtPrice: Money | null;
  category: { id: string; name: string } | null;
  imageUrl: string | null;
  variantCount: number;
  totalStock: number;
}

export interface AdminVariant {
  id: string;
  sku: string;
  size: string | null;
  colour: string | null;
  // null = uses the product price
  price: Money | null;
  effectivePrice: Money;
  stock: number;
  isActive: boolean;
  sortOrder: number;
  // false once the variant appears in an order (it can then only be hidden)
  canDelete: boolean;
}

export interface AdminProductImage {
  id: string;
  url: string;
  altText: string | null;
  colour: string | null;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  details: string | null;
  status: ProductStatus;
  isFeatured: boolean;
  isNewArrival: boolean;
  isReadyToShip: boolean;
  deliveryDays: number | null;
  badge: string | null;
  tags: string[];
  salesCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
  price: Money;
  compareAtPrice: Money | null;
  category: { id: string; name: string } | null;
  sizeGuide: { id: string; name: string } | null;
  images: AdminProductImage[];
  attributeValues: { id: string; value: string; attributeId: string; attributeName: string }[];
  variants: AdminVariant[];
}

// Body for create / update (cents, ids)
export interface ProductInput {
  name?: string;
  slug?: string;
  description?: string | null;
  details?: string | null;
  status?: ProductStatus;
  categoryId?: string | null;
  price?: number;
  compareAtPrice?: number | null;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isReadyToShip?: boolean;
  deliveryDays?: number | null;
  badge?: string | null;
  tags?: string[];
  sizeGuideId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  images?: { url: string; altText?: string | null; colour?: string | null }[];
  attributeValueIds?: string[];
}

export interface ProductListQuery {
  q?: string;
  status?: ProductStatus | "";
  categoryId?: string;
  page?: number;
  pageSize?: number;
}

export interface GenerateVariantsInput {
  sizes: string[];
  colours: string[];
  price?: number;
  stock?: number;
  // false = create them hidden from the shop
  isActive?: boolean;
}

export interface CategoryNode {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
  showInMenu: boolean;
  productCount: number;
  children: CategoryNode[];
}

export interface CategoryFull {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  tileImageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
  isVisible: boolean;
  showInMenu: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface CategoryInput {
  name?: string;
  slug?: string;
  description?: string | null;
  imageUrl?: string | null;
  tileImageUrl?: string | null;
  parentId?: string | null;
  isVisible?: boolean;
  showInMenu?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface AttributeValue {
  id: string;
  value: string;
  slug: string;
  sortOrder: number;
}

export interface Attribute {
  id: string;
  name: string;
  slug: string;
  isFilterable: boolean;
  sortOrder: number;
  values: AttributeValue[];
}

export interface SizeGuide {
  id: string;
  name: string;
  content: string;
  updatedAt: string;
  _count: { products: number };
}
