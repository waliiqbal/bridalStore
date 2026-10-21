import { ApiError, apiFetch } from "@/infrastructure/http/api-client";
import type {
  CheckoutInput,
  CheckoutProblem,
  PaymentConfig,
  PaymentResult,
  PlacedOrder,
  StripeIntent,
} from "../types/checkout";

// Browser-side calls for checking out and paying. The amount to pay always comes from the order
// on the server; nothing here sends a price.

// Creates the order and holds its stock. The Idempotency-Key makes a repeated click (or a retry
// after a bad connection) give back the SAME order instead of making a second one.
export const placeOrder = (input: CheckoutInput, idempotencyKey: string) =>
  apiFetch<PlacedOrder>("/checkout", {
    method: "POST",
    body: input,
    headers: { "Idempotency-Key": idempotencyKey },
  });

// When the server answers 409 it sends the list of things to fix; this pulls that list out
export function problemsFrom(error: unknown): CheckoutProblem[] | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const body = error.body as { problems?: CheckoutProblem[] } | undefined;
  return Array.isArray(body?.problems) ? body.problems : null;
}

export const getPaymentConfig = () => apiFetch<PaymentConfig>("/payments/config");

export const startStripe = (orderNumber: string) =>
  apiFetch<StripeIntent>("/payments/stripe/intent", { method: "POST", body: { orderNumber } });

// Square charges the card token straight away (402 if the card is declined)
export const paySquare = (orderNumber: string, sourceId: string, verificationToken?: string) =>
  apiFetch<PaymentResult>("/payments/square", {
    method: "POST",
    body: { orderNumber, sourceId, verificationToken },
  });

export const startPayPal = (orderNumber: string) =>
  apiFetch<{ orderNumber: string; paypalOrderId: string }>("/payments/paypal/order", {
    method: "POST",
    body: { orderNumber },
  });

export const capturePayPal = (orderNumber: string, paypalOrderId: string) =>
  apiFetch<PaymentResult>("/payments/paypal/capture", {
    method: "POST",
    body: { orderNumber, paypalOrderId },
  });

// After returning from a provider: the server asks the provider for the real status
export const confirmPayment = (orderNumber: string) =>
  apiFetch<PaymentResult>(`/payments/${encodeURIComponent(orderNumber)}/confirm`, { method: "POST" });
