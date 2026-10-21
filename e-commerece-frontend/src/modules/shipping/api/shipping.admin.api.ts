import { apiFetch } from "@/infrastructure/http/api-client";
import type { RateInput, ShippingRate, ShippingZone, ZoneInput } from "../types/shipping";

// Browser-side calls to /api/admin/shipping/zones (the admin cookie is sent automatically).

export const listZones = () => apiFetch<ShippingZone[]>("/admin/shipping/zones");

export const createZone = (input: ZoneInput) =>
  apiFetch<ShippingZone>("/admin/shipping/zones", { method: "POST", body: input });

export const updateZone = (id: string, input: ZoneInput) =>
  apiFetch<ShippingZone>(`/admin/shipping/zones/${id}`, { method: "PATCH", body: input });

export const deleteZone = (id: string) =>
  apiFetch<{ deleted: true }>(`/admin/shipping/zones/${id}`, { method: "DELETE" });

export const createRate = (zoneId: string, input: RateInput) =>
  apiFetch<ShippingRate>(`/admin/shipping/zones/${zoneId}/rates`, { method: "POST", body: input });

export const updateRate = (zoneId: string, rateId: string, input: RateInput) =>
  apiFetch<ShippingRate>(`/admin/shipping/zones/${zoneId}/rates/${rateId}`, { method: "PATCH", body: input });

export const deleteRate = (zoneId: string, rateId: string) =>
  apiFetch<{ deleted: true }>(`/admin/shipping/zones/${zoneId}/rates/${rateId}`, { method: "DELETE" });
