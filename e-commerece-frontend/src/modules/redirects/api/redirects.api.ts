import { apiFetch } from "@/infrastructure/http/api-client";
import type { Paginated } from "@/modules/catalog/types/catalog";
import type { AdminRedirect, RedirectListQuery } from "../types/redirects";

// Browser-side calls to /api/admin/redirects (the admin cookie is sent automatically).

export function listRedirects({ q, page, pageSize }: RedirectListQuery) {
  const search = new URLSearchParams();
  if (q) search.set("q", q);
  if (page) search.set("page", String(page));
  if (pageSize) search.set("pageSize", String(pageSize));
  const text = search.toString();
  return apiFetch<Paginated<AdminRedirect>>(`/admin/redirects${text ? `?${text}` : ""}`);
}

export const createRedirect = (fromPath: string, toPath: string) =>
  apiFetch<AdminRedirect>("/admin/redirects", { method: "POST", body: { fromPath, toPath } });

export const updateRedirect = (id: string, toPath: string) =>
  apiFetch<AdminRedirect>(`/admin/redirects/${id}`, { method: "PATCH", body: { toPath } });

export const deleteRedirect = (id: string) =>
  apiFetch<{ deleted: true }>(`/admin/redirects/${id}`, { method: "DELETE" });
