"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LuCircleCheck, LuClock, LuTriangleAlert } from "react-icons/lu";
import { OrderDetailBody } from "@/modules/account/components/OrderDetailBody";
import { OrderStatusBadge } from "@/modules/account/components/OrderStatusBadge";
import { hasReceipt, ReceiptHeading, type ReceiptShop } from "@/modules/account/components/Receipt";
import { ReceiptButton } from "@/modules/account/components/ReceiptButton";
import { useShopper } from "@/modules/account/components/ShopperProvider";
import { useCart } from "@/modules/cart/components/CartProvider";
import { trackPurchase } from "@/modules/tracking/lib/track";
import { formatDate } from "@/shared/lib/date";
import { confirmPayment } from "../api/checkout.api";
import type { PaymentResult } from "../types/checkout";

const RETRY_MS = 3000;
const MAX_TRIES = 8;

// The page after paying. It never trusts the address or the browser: it asks the server, which
// asks the payment provider, whether the order is really paid. If the bank is slow to answer it
// keeps asking for a little while (the provider also tells the server directly).
export function CheckoutSuccess({ orderNumber, shop }: { orderNumber: string; shop: ReceiptShop }) {
  const { customer } = useShopper();
  const { refresh: refreshBag } = useCart();
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    void (async () => {
      for (let attempt = 0; attempt < MAX_TRIES && current; attempt++) {
        try {
          const answer = await confirmPayment(orderNumber);
          if (!current) return;
          setResult(answer);
          if (answer.paid) {
            const { order } = answer;
            trackPurchase(
              order.orderNumber,
              order.items.map((i) => ({ sku: i.sku, name: i.productName, unitPrice: i.unitPrice.amount, quantity: i.quantity })),
              order.totals.total.amount,
              order.currencyCode,
            );
          }
          if (answer.status !== "PENDING_PAYMENT") {
            await refreshBag();
            return;
          }
        } catch (error) {
          if (!current) return;
          setFailed(
            error instanceof Error ? error.message : "We couldn't check your order. Please refresh the page.",
          );
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
      }
    })();
    return () => {
      current = false;
    };
  }, [orderNumber, refreshBag]);

  if (failed) {
    return (
      <div role="alert" className="mx-auto max-w-lg py-16 text-center">
        <LuTriangleAlert className="mx-auto h-12 w-12 text-amber-600" aria-hidden />
        <h1 className="mt-4 font-serif text-3xl font-bold">We couldn&apos;t check your order</h1>
        <p className="mt-3 text-muted">{failed}</p>
        <p className="mt-3 text-sm text-muted">
          If you were charged, don&apos;t worry: your payment is safe and we can see it.{" "}
          <Link href="/pages/contact-us" className="underline underline-offset-4 hover:text-gold">
            Contact us
          </Link>{" "}
          with order number {orderNumber}.
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <p role="status" className="py-24 text-center text-muted">
        Checking your payment…
      </p>
    );
  }

  const { order } = result;
  const paid = result.paid;
  const waiting = result.status === "PENDING_PAYMENT";

  return (
    <div className="mx-auto max-w-3xl">
      <ReceiptHeading shop={shop} />
      <header className="py-8 text-center print:py-0 print:text-left">
        {paid ? (
          <LuCircleCheck className="mx-auto h-14 w-14 text-gold print:hidden" aria-hidden />
        ) : waiting ? (
          <LuClock className="mx-auto h-14 w-14 text-amber-600" aria-hidden />
        ) : (
          <LuTriangleAlert className="mx-auto h-14 w-14 text-red-600" aria-hidden />
        )}
        <h1 className="mt-4 font-serif text-3xl font-bold sm:text-4xl">
          {paid
            ? "Thank you for your order!"
            : waiting
              ? "We're confirming your payment"
              : "This order wasn't paid"}
        </h1>
        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-muted">
          Order {order.orderNumber}
          <OrderStatusBadge status={order.status} label={order.statusLabel} />
        </p>
        <p className="mt-2 text-sm text-muted">Placed on {formatDate(order.placedAt ?? order.createdAt)}</p>
        {paid && (
          <p className="mx-auto mt-4 max-w-md text-sm">
            We have your order and will start preparing it. A confirmation will be sent to{" "}
            <strong>{order.email}</strong>.
          </p>
        )}
        {waiting && (
          <p className="mx-auto mt-4 max-w-md text-sm text-muted">
            Your bank is still answering. This page updates by itself; you don&apos;t need to pay again.
          </p>
        )}
        {!paid && !waiting && (
          <p className="mx-auto mt-4 max-w-md text-sm text-muted">
            Nothing was charged for this order.{" "}
            <Link href="/cart" className="underline underline-offset-4 hover:text-gold">
              Go back to your bag
            </Link>{" "}
            to try again.
          </p>
        )}
      </header>

      <OrderDetailBody order={order} />

      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row print:hidden">
        {hasReceipt(order.status) && <ReceiptButton orderNumber={order.orderNumber} />}
        {customer && (
          <Link
            href="/account/orders"
            className="inline-flex h-12 items-center bg-black px-8 text-sm font-medium uppercase tracking-wider text-white transition hover:bg-gold"
          >
            View my orders
          </Link>
        )}
        <Link
          href="/"
          className="inline-flex h-12 items-center border border-line px-8 text-sm font-medium uppercase tracking-wider transition hover:border-gold hover:text-gold"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
