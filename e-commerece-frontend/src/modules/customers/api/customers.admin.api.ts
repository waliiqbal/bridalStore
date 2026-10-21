import { apiFetch } from "@/infrastructure/http/api-client";
import type { Paginated } from "@/modules/catalog/types/catalog";
import type { AdminCustomer, AdminCustomerDetail } from "../types/customers";

// Browser-side calls to /api/admin/customers (the admin cookie is sent automatically).

export function listCustomers(query: { q?: string; page?: number; pageSize?: number }) {
  const search = new URLSearchParams();
  if (query.q) search.set("q", query.q);
  if (query.page) search.set("page", String(query.page));
  if (query.pageSize) search.set("pageSize", String(query.pageSize));
  const text = search.toString();
  return apiFetch<Paginated<AdminCustomer>>(`/admin/customers${text ? `?${text}` : ""}`);
}

export const getCustomer = (id: string) => apiFetch<AdminCustomerDetail>(`/admin/customers/${id}`);

// false = the customer can no longer sign in, and is signed out straight away
export const setCustomerActive = (id: string, isActive: boolean) =>
  apiFetch<AdminCustomerDetail>(`/admin/customers/${id}`, { method: "PATCH", body: { isActive } });
