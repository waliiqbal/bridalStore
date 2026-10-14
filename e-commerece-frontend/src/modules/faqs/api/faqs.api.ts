import { apiFetch } from "@/infrastructure/http/api-client";
import type { AdminFaq, FaqInput } from "../types/faqs";

// Browser-side calls to /api/admin/faqs (the admin cookie is sent automatically).

export const listFaqs = () => apiFetch<AdminFaq[]>("/admin/faqs");

export const createFaq = (input: FaqInput) =>
  apiFetch<AdminFaq>("/admin/faqs", { method: "POST", body: input });

export const updateFaq = (id: string, input: FaqInput) =>
  apiFetch<AdminFaq>(`/admin/faqs/${id}`, { method: "PATCH", body: input });

export const deleteFaq = (id: string) =>
  apiFetch<{ deleted: true }>(`/admin/faqs/${id}`, { method: "DELETE" });

export const reorderFaqs = (ids: string[]) =>
  apiFetch<{ reordered: number }>("/admin/faqs/reorder", { method: "PUT", body: { ids } });
