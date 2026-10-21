"use client";

import { FormError } from "@/shared/components/FormError";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/admin/Button";
import { formatMoney } from "@/shared/lib/money";
import type { OrderDetail } from "@/modules/account/types/account";
import { confirmPayment, startStripe } from "../api/checkout.api";
import { loadScript } from "../lib/load-script";
import type { StripeElements, StripeInstance } from "../lib/provider-types";
import type { PaymentConfig, PaymentResult } from "../types/checkout";

// Pay by card in the customer's own currency with Stripe. The card is typed into Stripe's own
// box (cards, Apple Pay, Google Pay); the card details never reach our server.
export function StripePayment({
  order,
  config,
  onPaid,
}: {
  order: OrderDetail;
  config: PaymentConfig;
  onPaid: (result: PaymentResult) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [setup, setSetup] = useState<{ stripe: StripeInstance; elements: StripeElements } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const test = config.driver === "fake";
  const stripeConfig = config.stripe;

  useEffect(() => {
    if (test || !stripeConfig) return;
    let cancelled = false;
    let mounted: { destroy(): void } | null = null;
    void (async () => {
      try {
        const [{ clientSecret }] = await Promise.all([
          startStripe(order.orderNumber),
          loadScript("https://js.stripe.com/v3/"),
        ]);
        if (cancelled || !window.Stripe || !box.current) return;
        const stripe = window.Stripe(stripeConfig.publishableKey);
        const elements = stripe.elements({ clientSecret });
        const element = elements.create("payment");
        element.mount(box.current);
        mounted = element;
        setSetup({ stripe, elements });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "The card form could not be loaded.");
      }
    })();
    return () => {
      cancelled = true;
      mounted?.destroy();
    };
  }, [test, stripeConfig, order.orderNumber]);

  async function pay() {
    if (!setup) return;
    setError(null);
    setPaying(true);
    try {
      const { error: stripeError } = await setup.stripe.confirmPayment({
        elements: setup.elements,
        // Used only if the bank sends the customer to another page to approve the payment
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success?order=${order.orderNumber}`,
        },
        redirect: "if_required",
      });
      if (stripeError) {
        setError(stripeError.message ?? "Your payment did not go through. Please try again.");
        return;
      }
      // The server asks Stripe for the real result; the browser's word is never trusted
      onPaid(await confirmPayment(order.orderNumber));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your payment did not go through. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  if (test) {
    return (
      <p className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Test mode: card payments in other currencies need real Stripe test keys, so they are not available
        here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div ref={box} aria-label="Card details" className="min-h-24" />
      {error && (
        <FormError>
          {error}
        </FormError>
      )}
      <Button
        onClick={pay}
        loading={paying}
        disabled={!setup}
        className="h-14 w-full text-sm uppercase tracking-wider"
      >
        Pay {formatMoney(order.totals.total)}
      </Button>
    </div>
  );
}
