import type { ImageDraft } from "../components/ProductImagesEditor";
import type { AdminProduct, ProductInput, ProductStatus } from "../types/catalog";

export interface ProductFormState {
  name: string;
  slug: string;
  description: string;
  details: string;
  status: ProductStatus;
  categoryId: string;
  price: number | null;
  compareAtPrice: number | null;
  images: ImageDraft[];
  attributeValueIds: string[];
  badge: string;
  deliveryDays: string;
  tags: string[];
  sizeGuideId: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isReadyToShip: boolean;
  seoTitle: string;
  seoDescription: string;
}

export type ProductFormErrors = Partial<Record<"name" | "price" | "compareAtPrice" | "deliveryDays", string>>;

export function toFormState(product: AdminProduct | null): ProductFormState {
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    details: product?.details ?? "",
    status: product?.status ?? "DRAFT",
    categoryId: product?.category?.id ?? "",
    price: product?.price.amount ?? null,
    compareAtPrice: product?.compareAtPrice?.amount ?? null,
    images: (product?.images ?? []).map((image) => ({
      url: image.url,
      altText: image.altText ?? "",
      colour: image.colour ?? "",
    })),
    attributeValueIds: product?.attributeValues.map((value) => value.id) ?? [],
    badge: product?.badge ?? "",
    deliveryDays: product?.deliveryDays != null ? String(product.deliveryDays) : "",
    tags: product?.tags ?? [],
    sizeGuideId: product?.sizeGuide?.id ?? "",
    isFeatured: product?.isFeatured ?? false,
    isNewArrival: product?.isNewArrival ?? false,
    isReadyToShip: product?.isReadyToShip ?? false,
    seoTitle: product?.seoTitle ?? "",
    seoDescription: product?.seoDescription ?? "",
  };
}

export function validateProduct(form: ProductFormState): ProductFormErrors {
  const errors: ProductFormErrors = {};
  if (!form.name.trim()) errors.name = "Please enter the product name.";
  if (form.price == null || form.price <= 0) errors.price = "Please enter the price customers will pay.";
  if (form.compareAtPrice != null && form.price != null && form.compareAtPrice <= form.price) {
    errors.compareAtPrice = "The original price must be higher than the selling price.";
  }
  if (form.deliveryDays.trim()) {
    const days = Number(form.deliveryDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      errors.deliveryDays = "Enter a number of days between 1 and 365.";
    }
  }
  return errors;
}

const orNull = (text: string) => (text.trim() ? text.trim() : null);

// `savedSlug` is the web address already stored (edit); it's only sent if changed.
export function toProductInput(form: ProductFormState, savedSlug?: string): ProductInput {
  const slug = form.slug.trim();
  return {
    name: form.name.trim(),
    ...(slug && slug !== savedSlug && { slug }),
    description: orNull(form.description),
    details: orNull(form.details),
    status: form.status,
    categoryId: form.categoryId || null,
    price: form.price ?? 0,
    compareAtPrice: form.compareAtPrice,
    isFeatured: form.isFeatured,
    isNewArrival: form.isNewArrival,
    isReadyToShip: form.isReadyToShip,
    deliveryDays: form.deliveryDays.trim() ? Number(form.deliveryDays) : null,
    badge: orNull(form.badge),
    tags: form.tags,
    sizeGuideId: form.sizeGuideId || null,
    seoTitle: orNull(form.seoTitle),
    seoDescription: orNull(form.seoDescription),
    images: form.images.map((image) => ({
      url: image.url,
      altText: orNull(image.altText),
      colour: orNull(image.colour),
    })),
    attributeValueIds: form.attributeValueIds,
  };
}

// Plain text from the rich description (for the Google preview)
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
