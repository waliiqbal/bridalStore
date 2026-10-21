import Image from "next/image";
import Link from "next/link";
import { countryName } from "@/shared/lib/countries";
import { formatMoney } from "@/shared/lib/money";
import type { OrderDetail } from "../types/account";

// The three blocks every order screen shows: what was bought, where it goes, and the money.
// Used by the shopper's order page, the "thank you" page, and the owner's order screen, so an
// order looks the same wherever it is read.

export function OrderItemsList({ items }: { items: OrderDetail["items"] }) {
  return (
    <ul className="divide-y divide-line rounded-sm border border-line bg-white">
      {items.map((item) => {
        const body = (
          <>
            <div className="relative h-24 w-[4.5rem] shrink-0 overflow-hidden bg-cream">
              {item.imageUrl && (
                <Image src={item.imageUrl} alt="" fill sizes="72px" className="object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-snug">{item.productName}</p>
              <p className="mt-1 text-sm text-muted">
                {[item.colour, item.size && `Size ${item.size}`].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-1 text-sm text-muted">
                {formatMoney(item.unitPrice)} × {item.quantity}
              </p>
            </div>
            <p className="shrink-0 font-medium">{formatMoney(item.lineTotal)}</p>
          </>
        );
        return (
          <li key={item.id}>
            {item.productSlug ? (
              <Link
                href={`/products/${item.productSlug}`}
                className="flex gap-4 p-3 hover:bg-cream/50 sm:p-4"
              >
                {body}
              </Link>
            ) : (
              <div className="flex gap-4 p-3 sm:p-4">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function OrderAddressCard({
  address: a,
  shippingMethod,
}: {
  address: OrderDetail["shippingAddress"];
  shippingMethod: string | null;
}) {
  return (
    <section aria-labelledby="ship-heading" className="rounded-sm border border-line bg-white p-4 sm:p-5">
      <h3 id="ship-heading" className="font-medium">
        Delivery address
      </h3>
      <address className="mt-2 text-sm not-italic leading-relaxed text-muted">
        {a.fullName}
        <br />
        {a.line1}
        {a.line2 && (
          <>
            <br />
            {a.line2}
          </>
        )}
        <br />
        {[a.city, a.state, a.postcode].filter(Boolean).join(" ")}
        <br />
        {countryName(a.countryCode)}
      </address>
      {shippingMethod && <p className="mt-3 text-sm text-muted">Shipping: {shippingMethod}</p>}
    </section>
  );
}

export function OrderTotalsCard({
  totals: t,
  couponCode,
}: {
  totals: OrderDetail["totals"];
  couponCode: string | null;
}) {
  return (
    <section aria-labelledby="total-heading" className="rounded-sm border border-line bg-white p-4 sm:p-5">
      <h3 id="total-heading" className="font-medium">
        Summary
      </h3>
      <dl className="mt-2 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd>{formatMoney(t.subtotal)}</dd>
        </div>
        {t.discount.amount > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted">Discount{couponCode ? ` (${couponCode})` : ""}</dt>
            <dd>−{formatMoney(t.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted">Shipping</dt>
          <dd>{t.shipping.amount === 0 ? "Free" : formatMoney(t.shipping)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-2 text-base font-medium">
          <dt>Total</dt>
          <dd>{formatMoney(t.total)}</dd>
        </div>
        {t.tax.amount > 0 && (
          <div className="flex justify-between text-xs text-muted">
            <dt>Includes GST</dt>
            <dd>{formatMoney(t.tax)}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
