import { apiFetch } from "@/infrastructure/http/api-client";
import type {
  AdminProduct,
  Attribute,
  AttributeValue,
  CategoryFull,
  CategoryInput,
  CategoryNode,
  GenerateVariantsInput,
  Paginated,
  ProductInput,
  ProductListItem,
  ProductListQuery,
  SizeGuide,
} from "../types/catalog";

// Browser-side calls to /api/admin/* (the admin cookie is sent automatically).

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

// ── Products ──
export const listProducts = (params: ProductListQuery) =>
  apiFetch<Paginated<ProductListItem>>(`/admin/products${query({ ...params })}`);

export const getProduct = (id: string) => apiFetch<AdminProduct>(`/admin/products/${id}`);

export const createProduct = (input: ProductInput) =>
  apiFetch<AdminProduct>("/admin/products", { method: "POST", body: input });

export const updateProduct = (id: string, input: ProductInput) =>
  apiFetch<AdminProduct>(`/admin/products/${id}`, { method: "PATCH", body: input });

export const deleteProduct = (id: string) =>
  apiFetch<{ deleted: boolean; archived: boolean; message?: string }>(`/admin/products/${id}`, {
    method: "DELETE",
  });

export const generateVariants = (productId: string, input: GenerateVariantsInput) =>
  apiFetch<{ created: number; alreadyExisted: number }>(
    `/admin/products/${productId}/variants/generate`,
    { method: "POST", body: input },
  );

export const updateVariant = (
  productId: string,
  variantId: string,
  input: { sku?: string; price?: number | null; stock?: number; isActive?: boolean },
) =>
  apiFetch<unknown>(`/admin/products/${productId}/variants/${variantId}`, {
    method: "PATCH",
    body: input,
  });

export const deleteVariant = (productId: string, variantId: string) =>
  apiFetch<{ deleted: boolean; deactivated: boolean; message?: string }>(
    `/admin/products/${productId}/variants/${variantId}`,
    { method: "DELETE" },
  );

// ── Categories ──
export const getCategoryTree = () => apiFetch<CategoryNode[]>("/admin/categories");

export const getCategory = (id: string) => apiFetch<CategoryFull>(`/admin/categories/${id}`);

export const createCategory = (input: CategoryInput) =>
  apiFetch<CategoryFull>("/admin/categories", { method: "POST", body: input });

export const updateCategory = (id: string, input: CategoryInput) =>
  apiFetch<CategoryFull>(`/admin/categories/${id}`, { method: "PATCH", body: input });

export const deleteCategory = (id: string) =>
  apiFetch<{ deleted: true }>(`/admin/categories/${id}`, { method: "DELETE" });

export const reorderCategories = (ids: string[]) =>
  apiFetch<{ reordered: number }>("/admin/categories/reorder", { method: "PUT", body: { ids } });

// ── Filters (attributes) ──
export const listAttributes = () => apiFetch<Attribute[]>("/admin/attributes");

export const createAttribute = (input: { name: string; isFilterable?: boolean }) =>
  apiFetch<Attribute>("/admin/attributes", { method: "POST", body: input });

export const updateAttribute = (id: string, input: { name?: string; isFilterable?: boolean }) =>
  apiFetch<Attribute>(`/admin/attributes/${id}`, { method: "PATCH", body: input });

export const deleteAttribute = (id: string) =>
  apiFetch<{ deleted: true }>(`/admin/attributes/${id}`, { method: "DELETE" });

export const reorderAttributes = (ids: string[]) =>
  apiFetch<{ reordered: number }>("/admin/attributes/reorder", { method: "PUT", body: { ids } });

export const createAttributeValue = (attributeId: string, value: string) =>
  apiFetch<AttributeValue>(`/admin/attributes/${attributeId}/values`, {
    method: "POST",
    body: { value },
  });

export const updateAttributeValue = (attributeId: string, valueId: string, value: string) =>
  apiFetch<AttributeValue>(`/admin/attributes/${attributeId}/values/${valueId}`, {
    method: "PATCH",
    body: { value },
  });

export const deleteAttributeValue = (attributeId: string, valueId: string) =>
  apiFetch<{ deleted: true }>(`/admin/attributes/${attributeId}/values/${valueId}`, {
    method: "DELETE",
  });

export const reorderAttributeValues = (attributeId: string, ids: string[]) =>
  apiFetch<{ reordered: number }>(`/admin/attributes/${attributeId}/values/reorder`, {
    method: "PUT",
    body: { ids },
  });

// ── Size guides ──
export const listSizeGuides = () => apiFetch<SizeGuide[]>("/admin/size-guides");

export const createSizeGuide = (input: { name: string; content: string }) =>
  apiFetch<SizeGuide>("/admin/size-guides", { method: "POST", body: input });

export const updateSizeGuide = (id: string, input: { name?: string; content?: string }) =>
  apiFetch<SizeGuide>(`/admin/size-guides/${id}`, { method: "PATCH", body: input });

export const deleteSizeGuide = (id: string) =>
  apiFetch<{ deleted: true }>(`/admin/size-guides/${id}`, { method: "DELETE" });
