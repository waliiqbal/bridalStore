"use client";

import { FormError } from "@/shared/components/FormError";
import { useEffect, useRef, useState } from "react";
import type { OrderDetail } from "@/modules/account/types/account";
import { capturePayPal, startPayPal } from "../api/checkout.api";
import { loadScript } from "../lib/load-script";
import type { PaymentConfig, PaymentResult } from "../types/checkout";

// The yellow PayPal button. The customer approves in PayPal's own window; the payment is then
// captured on our server, for the amount stored on the order.
export function PayPalPayment({
  order,
  config,
  onPaid,
}: {
  order: OrderDetail;
  config: PaymentConfig;
  onPaid: (result: PaymentResult) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  // The newest "paid" callback, without redrawing the PayPal buttons when it changes
  const paid = useRef(onPaid);
  useEffect(() => {
    paid.current = onPaid;
  }, [onPaid]);
  const [error, setError] = useState<string | null>(null);
  const test = config.driver === "fake";
  const paypal = config.paypal;

  useEffect(() => {
    if (test || !paypal) return;
    let cancelled = false;
    let buttons: { close(): Promise<void> } | null = null;
    void (async () => {
      try {
        // The currency must match the order's currency
        await loadScript(
          `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypal.clientId)}&currency=${encodeURIComponent(order.currencyCode)}&intent=capture&components=buttons`,
        );
        if (cancelled || !window.paypal || !box.current) return;
        const instance = window.paypal.Buttons({
          createOrder: async () => (await startPayPal(order.orderNumber)).paypalOrderId,
          onApprove: async ({ orderID }) => {
            setError(null);
            try {
              const result = await capturePayPal(order.orderNumber, orderID);
              if (result.paid) paid.current(result);
              else setError("We could not confirm your PayPal payment. Please try again.");
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Your payment did not go through. Please try again.",
              );
            }
          },
          onError: () =>
            setError("PayPal ran into a problem. Please try again or choose another way to pay."),
          onCancel: () => setError("You closed PayPal before paying. You can try again when you are ready."),
        });
        buttons = instance;
        await instance.render(box.current);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "PayPal could not be loaded.");
      }
    })();
    return () => {
      cancelled = true;
      void buttons?.close();
    };
  }, [test, paypal, order.orderNumber, order.currencyCode]);

  if (test) {
    return (
      <p className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Test mode: PayPal needs real PayPal test keys, so it is not available here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div ref={box} aria-label="PayPal" className="min-h-12" />
      {error && (
        <FormError>
          {error}
        </FormError>
      )}
    </div>
  );
}
