import { apiFetch } from "@/infrastructure/http/api-client";
import type {
  AdminCollection,
  CollectionInput,
  CollectionListItem,
  CollectionRule,
  PreviewResult,
} from "../types/collections";

// Browser-side calls to /api/admin/collections (the admin cookie is sent automatically).

export const listCollections = () => apiFetch<CollectionListItem[]>("/admin/collections");

export const getCollection = (id: string) => apiFetch<AdminCollection>(`/admin/collections/${id}`);

export const createCollection = (input: CollectionInput) =>
  apiFetch<AdminCollection>("/admin/collections", { method: "POST", body: input });

export const updateCollection = (id: string, input: CollectionInput) =>
  apiFetch<AdminCollection>(`/admin/collections/${id}`, { method: "PATCH", body: input });

export const deleteCollection = (id: string) =>
  apiFetch<{ deleted: true }>(`/admin/collections/${id}`, { method: "DELETE" });

export const addCollectionProducts = (id: string, productIds: string[]) =>
  apiFetch<{ added: number; alreadyInCollection: number }>(`/admin/collections/${id}/products`, {
    method: "POST",
    body: { productIds },
  });

export const reorderCollectionProducts = (id: string, productIds: string[]) =>
  apiFetch<{ reordered: number }>(`/admin/collections/${id}/products/reorder`, {
    method: "PUT",
    body: { productIds },
  });

export const removeCollectionProduct = (id: string, productId: string) =>
  apiFetch<{ removed: true }>(`/admin/collections/${id}/products/${productId}`, { method: "DELETE" });

// Which products would match these (unsaved) rules
export const previewRules = (input: {
  matchAllRules: boolean;
  rules: CollectionRule[];
  page: number;
  pageSize: number;
}) => apiFetch<PreviewResult>("/admin/collections/preview", { method: "POST", body: input });
