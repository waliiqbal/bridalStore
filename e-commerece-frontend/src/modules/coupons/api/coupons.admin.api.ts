import { apiFetch } from "@/infrastructure/http/api-client";
import type { Paginated } from "@/modules/catalog/types/catalog";
import type { AdminCoupon, CouponInput, CouponListQuery } from "../types/coupons";

// Browser-side calls to /api/admin/coupons (the admin cookie is sent automatically).

export function listCoupons({ q, page, pageSize }: CouponListQuery) {
  const search = new URLSearchParams();
  if (q) search.set("q", q);
  if (page) search.set("page", String(page));
  if (pageSize) search.set("pageSize", String(pageSize));
  const text = search.toString();
  return apiFetch<Paginated<AdminCoupon>>(`/admin/coupons${text ? `?${text}` : ""}`);
}

export const createCoupon = (input: CouponInput) =>
  apiFetch<AdminCoupon>("/admin/coupons", { method: "POST", body: input });

export const updateCoupon = (id: string, input: Partial<CouponInput>) =>
  apiFetch<AdminCoupon>(`/admin/coupons/${id}`, { method: "PATCH", body: input });

// 409 when the code has already been used in an order (switch it off instead)
export const deleteCoupon = (id: string) =>
  apiFetch<{ deleted: true }>(`/admin/coupons/${id}`, { method: "DELETE" });
