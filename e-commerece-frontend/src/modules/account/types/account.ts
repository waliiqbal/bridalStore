import type { Money } from "@/shared/lib/money";

// Matches the backend's customer, address and order responses exactly
// (/api/auth/*, /api/account/*).

export interface Customer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  marketingOptIn: boolean;
  createdAt: string;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postcode: string;
  // ISO 3166-1 alpha-2, e.g. "AU"
  countryCode: string;
  isDefault: boolean;
  createdAt: string;
}

export interface AddressInput {
  fullName: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postcode: string;
  countryCode: string;
  isDefault?: boolean;
}

export type OrderStatus =
  "PENDING_PAYMENT" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  // Plain words for the shopper, e.g. "Being prepared"
  statusLabel: string;
  email: string;
  shipFullName: string;
  shipCountryCode: string;
  total: Money;
  totalAud: Money;
  itemCount: number;
  imageUrl: string | null;
  placedAt: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productName: string;
  // Link to the live product, if it still exists
  productSlug: string | null;
  sku: string;
  size: string | null;
  colour: string | null;
  imageUrl: string | null;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
}

export interface OrderDetail {
  orderNumber: string;
  status: OrderStatus;
  statusLabel: string;
  email: string;
  phone: string | null;
  shippingAddress: {
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    postcode: string;
    countryCode: string;
  };
  currencyCode: string;
  items: OrderItem[];
  totals: { subtotal: Money; discount: Money; shipping: Money; tax: Money; total: Money };
  couponCode: string | null;
  shippingMethod: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  customerNote: string | null;
  placedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  // Only while waiting for payment
  payment: { methods: string[]; expiresAt: string | null } | null;
  timeline: { status: OrderStatus; label: string; at: string }[];
}
