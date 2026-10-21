import type { Money } from "@/shared/lib/money";
import type { OrderDetail, OrderStatus } from "@/modules/account/types/account";

// Matches the backend's admin order responses exactly (GET/POST /api/admin/orders...).
// The list uses the same summary the shopper's order list uses (OrderSummary).

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | string;

export interface AdminRefund {
  id: string;
  amount: Money;
  currencyCode: string;
  reason: string | null;
  // PENDING while the payment provider is still sending the money back
  status: "PENDING" | "SUCCEEDED" | "FAILED" | string;
  providerRefundId: string | null;
  createdBy: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface AdminPayment {
  id: string;
  provider: "SQUARE" | "STRIPE" | "PAYPAL";
  status: PaymentStatus;
  amount: Money;
  currencyCode: string;
  providerPaymentId: string | null;
  providerCaptureId: string | null;
  errorMessage: string | null;
  createdAt: string;
  refunds: AdminRefund[];
}

export interface AdminOrder extends Omit<OrderDetail, "timeline"> {
  id: string;
  // The order's total in AUD (for the owner's own reporting)
  totalAud: Money;
  exchangeRate: string;
  // The owner's private note, never shown to the customer
  adminNote: string | null;
  // Something the owner should look at (a payment problem, an automatic refund...)
  attentionNote: string | null;
  // The most that can still be refunded
  refundable: Money;
  reservationExpiresAt: string | null;
  // The next steps the owner may take, from the server
  nextStatuses: { status: OrderStatus; label: string }[];
  statusHistory: {
    from: OrderStatus | null;
    to: OrderStatus;
    label: string;
    note: string | null;
    changedBy: string | null;
    at: string;
  }[];
  payments: AdminPayment[];
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    // false = ordered as a guest
    hasAccount: boolean;
  } | null;
  updatedAt: string;
}

export interface OrderListQuery {
  status?: OrderStatus;
  needsAttention?: boolean;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ShipInput {
  trackingNumber: string;
  trackingUrl?: string | null;
  note?: string | null;
}
