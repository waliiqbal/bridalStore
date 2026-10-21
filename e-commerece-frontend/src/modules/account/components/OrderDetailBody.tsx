import Link from "next/link";
import { formatDate } from "@/shared/lib/date";
import type { OrderDetail } from "../types/account";
import { OrderAddressCard, OrderItemsList, OrderTotalsCard } from "./OrderParts";

// Everything about one order below its heading: payment notice, tracking, the items, the delivery
// address, the money, and the progress. Used by the account's order page and by the "thank you"
// page right after paying, so a shopper sees exactly the same order in both places.
export function OrderDetailBody({ order }: { order: OrderDetail }) {
  return (
    <>
      {order.payment && (
        <p className="mt-4 rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This order is waiting for payment. It is held for you for a short time
          {order.payment.expiresAt
            ? ` (until ${new Date(order.payment.expiresAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })})`
            : ""}
          .
        </p>
      )}

      {order.trackingNumber && (
        <p className="mt-4 rounded-sm border border-line bg-cream px-4 py-3 text-sm">
          <span className="font-medium">Tracking number:</span> {order.trackingNumber}
          {order.trackingUrl && (
            <>
              {" · "}
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-gold"
              >
                Track your parcel
              </a>
            </>
          )}
        </p>
      )}

      <div className="mt-6">
        <OrderItemsList items={order.items} />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <OrderAddressCard address={order.shippingAddress} shippingMethod={order.shippingMethod} />
        <OrderTotalsCard totals={order.totals} couponCode={order.couponCode} />
      </div>

      {order.timeline.length > 0 && (
        <section
          aria-labelledby="timeline-heading"
          className="mt-6 rounded-sm border border-line bg-white p-4 sm:p-5"
        >
          <h3 id="timeline-heading" className="font-medium">
            Order progress
          </h3>
          <ol className="mt-3 space-y-2 text-sm">
            {order.timeline.map((step, i) => (
              <li key={`${step.status}-${i}`} className="flex gap-3">
                <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>
                  {step.label} <span className="text-muted">· {formatDate(step.at)}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="mt-6 text-sm text-muted">
        Questions about this order?{" "}
        <Link href="/pages/contact-us" className="underline underline-offset-4 hover:text-gold">
          Contact us
        </Link>{" "}
        and quote {order.orderNumber}.
      </p>
    </>
  );
}
