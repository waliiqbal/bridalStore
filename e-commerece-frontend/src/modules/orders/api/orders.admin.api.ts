import { apiFetch } from "@/infrastructure/http/api-client";
import type { OrderStatus, OrderSummary } from "@/modules/account/types/account";
import type { Paginated } from "@/modules/catalog/types/catalog";
import type { AdminOrder, OrderListQuery, ShipInput } from "../types/orders";

// Browser-side calls to /api/admin/orders (the admin cookie is sent automatically).

export function listOrders({ status, needsAttention, q, page, pageSize }: OrderListQuery) {
  const search = new URLSearchParams();
  if (status) search.set("status", status);
  if (needsAttention) search.set("needsAttention", "true");
  if (q) search.set("q", q);
  if (page) search.set("page", String(page));
  if (pageSize) search.set("pageSize", String(pageSize));
  const text = search.toString();
  return apiFetch<Paginated<OrderSummary>>(`/admin/orders${text ? `?${text}` : ""}`);
}

export const getOrder = (id: string) => apiFetch<AdminOrder>(`/admin/orders/${id}`);

// Every change answers with the order as it is now
interface Changed {
  order: AdminOrder;
}

export const changeStatus = (id: string, status: OrderStatus, extra: Partial<ShipInput> = {}) =>
  apiFetch<Changed>(`/admin/orders/${id}/status`, { method: "POST", body: { status, ...extra } });

export const shipOrder = (id: string, input: ShipInput) => changeStatus(id, "SHIPPED", input);

export const saveOrderNote = (id: string, adminNote: string | null) =>
  apiFetch<unknown>(`/admin/orders/${id}`, { method: "PATCH", body: { adminNote } });

export const resolveAttention = (id: string) =>
  apiFetch<unknown>(`/admin/orders/${id}`, { method: "PATCH", body: { resolveAttention: true } });

// amount in the order's currency cents; leave it out to refund everything still refundable
export const refundOrder = (id: string, reason: string, amount?: number) =>
  apiFetch<Changed>(`/admin/orders/${id}/refund`, { method: "POST", body: { reason, amount } });

export const cancelAndRefund = (id: string, reason: string) =>
  apiFetch<Changed>(`/admin/orders/${id}/cancel-and-refund`, { method: "POST", body: { reason } });
