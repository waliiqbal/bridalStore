import { apiFetch } from "@/infrastructure/http/api-client";
import type { Paginated } from "@/modules/catalog/types/catalog";
import type {
  AdminEnquiry,
  EnquiryCounts,
  EnquiryInput,
  EnquiryListQuery,
  EnquiryOptions,
  EnquiryStatus,
} from "../types/enquiries";

// Browser-side calls. (The server-side read of the form choices is in enquiry-options.api.ts.)

// ───────── Public form ─────────

export const submitEnquiry = (input: EnquiryInput) =>
  apiFetch<{ received: true }>("/enquiries", { method: "POST", body: input });

// The choices and their labels (the admin list turns codes like LEHENGA into "Bridal lehenga")
export const fetchEnquiryOptions = () => apiFetch<EnquiryOptions>("/enquiries/options");

// ───────── Admin (the admin cookie is sent automatically) ─────────

export function listEnquiries({ status, q, sort, page, pageSize }: EnquiryListQuery) {
  const search = new URLSearchParams();
  if (status) search.set("status", status);
  if (q) search.set("q", q);
  if (sort) search.set("sort", sort);
  if (page) search.set("page", String(page));
  if (pageSize) search.set("pageSize", String(pageSize));
  const text = search.toString();
  return apiFetch<Paginated<AdminEnquiry>>(`/admin/enquiries${text ? `?${text}` : ""}`);
}

export const getEnquiryCounts = () => apiFetch<EnquiryCounts>("/admin/enquiries/counts");

export const updateEnquiry = (id: string, changes: { status?: EnquiryStatus; adminNote?: string | null }) =>
  apiFetch<AdminEnquiry>(`/admin/enquiries/${id}`, { method: "PATCH", body: changes });

export const deleteEnquiry = (id: string) =>
  apiFetch<{ success: true }>(`/admin/enquiries/${id}`, { method: "DELETE" });
