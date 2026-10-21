import type { Money } from "@/shared/lib/money";

// Matches the backend's admin shipping responses exactly (GET/POST /api/admin/shipping/zones...).
// Prices are in Australian dollars (AUD cents); customers in other currencies see them converted.

export interface ShippingRate {
  id: string;
  // e.g. "Standard", "Express"
  name: string;
  // AUD cents
  price: number;
  priceMoney: Money;
  // The order value (AUD cents, after discount) from which this rate is free
  freeOverAmount: number | null;
  freeOver: Money | null;
  // e.g. "3–7 business days"
  estimatedDays: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface ShippingZone {
  id: string;
  name: string;
  // ISO 2-letter codes. A country can be in only one zone.
  countryCodes: string[];
  // "Rest of the world": every country not listed in another zone
  isFallback: boolean;
  // Australian GST applies to orders sent to this zone
  chargesGst: boolean;
  rates: ShippingRate[];
}

export interface ZoneInput {
  name: string;
  countryCodes: string[];
  isFallback: boolean;
  chargesGst: boolean;
}

export interface RateInput {
  name: string;
  price: number;
  freeOverAmount: number | null;
  estimatedDays: string | null;
  isActive: boolean;
}
