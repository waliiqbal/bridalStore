"use client";

import { FormError } from "@/shared/components/FormError";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/admin/Button";
import { centsToInputText, formatMoney } from "@/shared/lib/money";
import type { OrderDetail } from "@/modules/account/types/account";
import { paySquare } from "../api/checkout.api";
import { loadScript } from "../lib/load-script";
import type { SquareCard, SquarePayments } from "../lib/provider-types";
import type { PaymentConfig, PaymentResult } from "../types/checkout";

const SDK = {
  sandbox: "https://sandbox.web.squarecdn.com/v1/square.js",
  production: "https://web.squarecdn.com/v1/square.js",
} as const;

// Pay by card with Square (AUD orders). The card number is typed into Square's own box, which
// hands us a one-time token; the card details never reach our server.
export function SquarePayment({
  order,
  config,
  onPaid,
}: {
  order: OrderDetail;
  config: PaymentConfig;
  onPaid: (result: PaymentResult) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [payments, setPayments] = useState<SquarePayments | null>(null);
  const [card, setCard] = useState<SquareCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const test = config.driver === "fake";
  const square = config.square;

  // Load Square's card box
  useEffect(() => {
    if (test || !square) return;
    let cancelled = false;
    let attached: SquareCard | null = null;
    void (async () => {
      try {
        await loadScript(SDK[square.environment === "production" ? "production" : "sandbox"]);
        if (cancelled || !window.Square || !box.current) return;
        const sdk = await window.Square.payments(square.applicationId, square.locationId);
        const field = await sdk.card();
        await field.attach(box.current);
        if (cancelled) {
          void field.destroy();
          return;
        }
        attached = field;
        setPayments(sdk);
        setCard(field);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "The card form could not be loaded.");
      }
    })();
    return () => {
      cancelled = true;
      void attached?.destroy();
    };
  }, [test, square]);

  async function pay() {
    setError(null);
    setPaying(true);
    try {
      let token = "fake-card-ok";
      let verificationToken: string | undefined;

      if (!test) {
        if (!card || !payments) throw new Error("The card form is still loading. Please wait a moment.");
        const tokenized = await card.tokenize();
        if (tokenized.status !== "OK" || !tokenized.token) {
          throw new Error(tokenized.errors?.[0]?.message ?? "Please check your card details and try again.");
        }
        token = tokenized.token;
        // Extra bank check (3-D Secure). If it can't be done, the charge goes ahead without it.
        const a = order.shippingAddress;
        const [givenName, ...rest] = a.fullName.split(" ");
        verificationToken = (
          await payments
            .verifyBuyer(token, {
              intent: "CHARGE",
              amount: centsToInputText(order.totals.total.amount),
              currencyCode: order.currencyCode,
              billingContact: {
                givenName,
                familyName: rest.join(" "),
                email: order.email,
                addressLines: [a.line1],
                city: a.city,
                countryCode: a.countryCode,
              },
            })
            .catch(() => null)
        )?.token;
      }

      const result = await paySquare(order.orderNumber, token, verificationToken);
      if (result.paid) onPaid(result);
      else setError("We could not confirm your payment. Please try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your payment did not go through. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="space-y-4">
      {test ? (
        <p className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Test mode: no real card is needed. Pressing the button below makes a pretend payment.
        </p>
      ) : (
        <div ref={box} aria-label="Card details" className="min-h-24" />
      )}
      {error && (
        <FormError>
          {error}
        </FormError>
      )}
      <Button
        onClick={pay}
        loading={paying}
        disabled={!test && !card}
        className="h-14 w-full text-sm uppercase tracking-wider"
      >
        Pay {formatMoney(order.totals.total)}
      </Button>
    </div>
  );
}
