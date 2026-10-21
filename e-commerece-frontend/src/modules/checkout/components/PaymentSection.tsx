"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPaymentConfig } from "../api/checkout.api";
import type { PaymentConfig, PaymentProvider, PaymentResult, PlacedOrder } from "../types/checkout";
import { PayPalPayment } from "./PayPalPayment";
import { SquarePayment } from "./SquarePayment";
import { StripePayment } from "./StripePayment";

const LABEL: Record<PaymentProvider, string> = {
  SQUARE: "Credit or debit card",
  STRIPE: "Credit or debit card",
  PAYPAL: "PayPal",
};

// Step "Payment": the order exists and is held, now the customer chooses how to pay. Which ways
// are offered is decided by the server (Square or PayPal for AUD; Stripe or PayPal for other
// currencies, and only the ones that are switched on).
export function PaymentSection({
  placed,
  onPaid,
}: {
  placed: PlacedOrder;
  onPaid: (result: PaymentResult) => void;
}) {
  const { order, paymentMethods } = placed;
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [configFailed, setConfigFailed] = useState(false);
  const [method, setMethod] = useState<PaymentProvider | null>(paymentMethods[0] ?? null);

  useEffect(() => {
    let current = true;
    getPaymentConfig()
      .then((value) => current && setConfig(value))
      .catch(() => current && setConfigFailed(true));
    return () => {
      current = false;
    };
  }, []);

  const holdUntil = order.payment?.expiresAt
    ? new Date(order.payment.expiresAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <section aria-labelledby="payment-heading" className="space-y-5">
      <div>
        <h2 id="payment-heading" className="font-serif text-xl font-bold">
          Payment
        </h2>
        <p className="mt-1 text-sm text-muted">
          Order {order.orderNumber} is held for you{holdUntil ? ` until ${holdUntil}` : " for a short time"}.
        </p>
      </div>

      {paymentMethods.length === 0 ? (
        <p
          role="alert"
          className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          We can&apos;t take payment online just yet.{" "}
          <Link href="/pages/contact-us" className="underline underline-offset-4">
            Contact us
          </Link>{" "}
          with your order number {order.orderNumber} and we will help you pay.
        </p>
      ) : configFailed ? (
        <p role="alert" className="text-sm text-red-600">
          The payment form could not be loaded. Please refresh the page and try again.
        </p>
      ) : !config || !method ? (
        <p className="text-sm text-muted" role="status">
          Loading payment options…
        </p>
      ) : (
        <>
          {paymentMethods.length > 1 && (
            <fieldset className="space-y-2">
              <legend className="sr-only">How would you like to pay?</legend>
              {paymentMethods.map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-3 rounded-sm border px-4 py-3 text-sm ${
                    method === option ? "border-black" : "border-line hover:border-gold"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    checked={method === option}
                    onChange={() => setMethod(option)}
                    className="h-4 w-4 accent-black"
                  />
                  {LABEL[option]}
                </label>
              ))}
            </fieldset>
          )}

          {/* A fresh form each time the method changes */}
          {method === "SQUARE" && (
            <SquarePayment key="square" order={order} config={config} onPaid={onPaid} />
          )}
          {method === "STRIPE" && (
            <StripePayment key="stripe" order={order} config={config} onPaid={onPaid} />
          )}
          {method === "PAYPAL" && (
            <PayPalPayment key="paypal" order={order} config={config} onPaid={onPaid} />
          )}
        </>
      )}
    </section>
  );
}
