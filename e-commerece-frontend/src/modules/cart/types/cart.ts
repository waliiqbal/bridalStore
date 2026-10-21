import type { Money } from "@/shared/lib/money";

// Matches the backend's cart responses exactly (GET /api/cart and the other cart endpoints,
// plus GET /api/shipping/options). Every price already arrives as { amount (cents), currencyCode }.

export type CartLineStatus = "OK" | "LIMITED" | "OUT_OF_STOCK" | "UNAVAILABLE";

export interface CartLine {
  id: string;
  variantId: string;
  quantity: number;
  status: CartLineStatus;
  // How many of this one can be bought right now
  availableQuantity: number;
  // Plain words when something is wrong, e.g. "Only 2 available."
  message: string | null;
  product: { id: string; name: string; slug: string; imageUrl: string | null; imageAlt: string | null };
  sku: string;
  size: string | null;
  colour: string | null;
  unitPrice: Money;
  compareAtUnitPrice: Money | null;
  lineTotal: Money;
}

export type TaxStatus = "INCLUDED" | "NOT_APPLICABLE" | "CALCULATED_AT_CHECKOUT";

export interface CartCoupon {
  id: string | null;
  code: string;
  type: string | null;
  valid: boolean;
  reason: string | null;
  message: string | null;
}

export interface CartView {
  id: string | null;
  currencyCode: string;
  items: CartLine[];
  // Total pieces in the bag (for the header badge)
  itemCount: number;
  totals: {
    subtotal: Money;
    discount: Money;
    // null until the destination country is known
    shipping: Money | null;
    // The GST already included in the total (null when it can't be worked out yet)
    tax: Money | null;
    total: Money;
    totalAud: Money;
  };
  tax: { status: TaxStatus; ratePercent: string | null };
  // Export prices only: the GST taken off the prices for this destination
  gstRemovedForExport: Money | null;
  shipping: {
    country: string | null;
    // false = we don't ship to this country; null = country not known yet
    available: boolean | null;
    zone: { id: string; name: string } | null;
    rate: { id: string; name: string; estimatedDays: string | null; isFree: boolean } | null;
    // true when the cheapest rate was picked as an estimate
    isEstimate: boolean;
  };
  coupon: CartCoupon | null;
  // False while the bag is empty or any line has a problem
  canCheckout: boolean;
  // e.g. "Only 2 available. We've added the maximum to your bag."
  notice: string | null;
  expiresAt: string | null;
}

export interface ShippingOption {
  id: string;
  name: string;
  estimatedDays: string | null;
  price: Money;
  isFree: boolean;
  // The order value above which this option is free
  freeOver: Money | null;
}

export interface ShippingOptions {
  country: string;
  currencyCode: string;
  // false = we don't ship to this country
  available: boolean;
  zone: { id: string; name: string; chargesGst: boolean } | null;
  options: ShippingOption[];
}

// What the cart endpoints need to price the bag
export interface CartPricing {
  currency?: string;
  country?: string;
  shippingRateId?: string;
}
