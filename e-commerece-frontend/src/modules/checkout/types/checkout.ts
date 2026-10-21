import type { Money } from "@/shared/lib/money";
import type { AddressInput, OrderDetail, OrderStatus } from "@/modules/account/types/account";

// Matches the backend's checkout and payment responses exactly
// (POST /api/checkout, /api/payments/*, GET /api/payments/config).

export type PaymentProvider = "SQUARE" | "STRIPE" | "PAYPAL";

// Something the shopper must fix before an order can be placed
export interface CheckoutProblem {
  code: string;
  message: string;
  // Set when it is about one item in the bag
  lineId?: string;
}

export interface CheckoutInput {
  // Guests only; a signed-in customer's account email is used
  email?: string;
  phone?: string | null;
  // Either a saved address of the signed-in customer...
  addressId?: string;
  // ...or a new one
  shippingAddress?: Omit<AddressInput, "isDefault">;
  shippingRateId?: string;
  currency?: string;
  customerNote?: string | null;
  marketingOptIn?: boolean;
}

// 201: the order exists (unpaid, its stock held for 30 minutes) and these are the ways to pay it
export interface PlacedOrder {
  order: OrderDetail;
  paymentMethods: PaymentProvider[];
}

// What every payment step answers
export interface PaymentResult {
  paid: boolean;
  status: OrderStatus;
  statusLabel: string;
  order: OrderDetail;
}

// The public settings the payment forms need (never a secret)
export interface PaymentConfig {
  // "fake" = the test mode used in development; no real provider is contacted
  driver: "live" | "fake";
  stripe: { publishableKey: string; environment: "sandbox" | "production" } | null;
  square: { applicationId: string; locationId: string; environment: "sandbox" | "production" } | null;
  paypal: { clientId: string; environment: "sandbox" | "production" } | null;
}

export interface StripeIntent {
  orderNumber: string;
  clientSecret: string;
  amount: Money;
}
