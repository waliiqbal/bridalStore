import { apiFetch } from "@/infrastructure/http/api-client";
import type { AdminBanner, BannerInput } from "../types/banners";

// Browser-side calls to /api/admin/banners (the admin cookie is sent automatically).

export const listBanners = () => apiFetch<AdminBanner[]>("/admin/banners");

export const createBanner = (input: BannerInput) =>
  apiFetch<AdminBanner>("/admin/banners", { method: "POST", body: input });

export const updateBanner = (id: string, input: BannerInput) =>
  apiFetch<AdminBanner>(`/admin/banners/${id}`, { method: "PATCH", body: input });

export const deleteBanner = (id: string) =>
  apiFetch<{ deleted: true }>(`/admin/banners/${id}`, { method: "DELETE" });

export const reorderBanners = (ids: string[]) =>
  apiFetch<{ reordered: number }>("/admin/banners/reorder", { method: "PUT", body: { ids } });
