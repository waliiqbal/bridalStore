import { apiFetch } from "@/infrastructure/http/api-client";
import type { Paginated } from "@/modules/catalog/types/catalog";
import type { AdminReview, ReviewCounts, ReviewStatus } from "../types/reviews";

// Browser-side calls to /api/admin/reviews (the admin cookie is sent automatically).

export function listReviews(query: { status?: ReviewStatus; q?: string; page?: number; pageSize?: number }) {
  const search = new URLSearchParams();
  if (query.status) search.set("status", query.status);
  if (query.q) search.set("q", query.q);
  if (query.page) search.set("page", String(query.page));
  if (query.pageSize) search.set("pageSize", String(query.pageSize));
  const text = search.toString();
  return apiFetch<Paginated<AdminReview>>(`/admin/reviews${text ? `?${text}` : ""}`);
}

export const getReviewCounts = () => apiFetch<ReviewCounts>("/admin/reviews/counts");

export const updateReview = (id: string, changes: { status?: ReviewStatus; shopReply?: string | null }) =>
  apiFetch<AdminReview>(`/admin/reviews/${id}`, { method: "PATCH", body: changes });

export const deleteReview = (id: string) =>
  apiFetch<{ deleted: true }>(`/admin/reviews/${id}`, { method: "DELETE" });
