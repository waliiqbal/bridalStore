import { apiFetch } from "@/infrastructure/http/api-client";
import type { CartPricing, CartView, ShippingOptions } from "../types/cart";

// Browser-side calls for the bag. The cart cookie is sent automatically; the server prices
// everything, so nothing here sends a price.

function query({ currency, country, shippingRateId }: CartPricing): string {
  const search = new URLSearchParams();
  if (currency) search.set("currency", currency);
  if (country) search.set("country", country);
  if (shippingRateId) search.set("shippingRateId", shippingRateId);
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const getCart = (pricing: CartPricing) => apiFetch<CartView>(`/cart${query(pricing)}`);

export const addToCart = (variantId: string, quantity: number, pricing: CartPricing) =>
  apiFetch<CartView>(`/cart/items${query(pricing)}`, { method: "POST", body: { variantId, quantity } });

export const setLineQuantity = (lineId: string, quantity: number, pricing: CartPricing) =>
  apiFetch<CartView>(`/cart/items/${lineId}${query(pricing)}`, { method: "PATCH", body: { quantity } });

export const removeLine = (lineId: string, pricing: CartPricing) =>
  apiFetch<CartView>(`/cart/items/${lineId}${query(pricing)}`, { method: "DELETE" });

// The server answers 400 with the reason when a code can't be used (expired, minimum spend...)
export const applyCouponCode = (code: string, pricing: CartPricing) =>
  apiFetch<CartView>(`/cart/coupon${query(pricing)}`, { method: "POST", body: { code } });

export const removeCouponCode = (pricing: CartPricing) =>
  apiFetch<CartView>(`/cart/coupon${query(pricing)}`, { method: "DELETE" });

export const getShippingOptions = (country: string, currency: string) =>
  apiFetch<ShippingOptions>(
    `/shipping/options?country=${encodeURIComponent(country)}&currency=${encodeURIComponent(currency)}`,
  );
