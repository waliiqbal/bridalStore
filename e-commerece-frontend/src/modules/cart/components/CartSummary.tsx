import { formatMoney } from "@/shared/lib/money";
import type { CartView } from "../types/cart";

// The money part of the bag: subtotal, discount, shipping, total. Every figure comes from the
// server (the browser never works out a price).
export function CartSummary({ cart }: { cart: CartView }) {
  const { totals, coupon } = cart;
  const discounted = totals.discount.amount > 0;

  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted">Subtotal</dt>
        <dd>{formatMoney(totals.subtotal)}</dd>
      </div>
      {discounted && (
        <div className="flex justify-between text-emerald-700">
          <dt>Discount{coupon?.valid ? ` (${coupon.code})` : ""}</dt>
          <dd>−{formatMoney(totals.discount)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-muted">Shipping</dt>
        <dd>
          {totals.shipping === null ? (
            <span className="text-muted">Worked out at checkout</span>
          ) : totals.shipping.amount === 0 ? (
            "Free"
          ) : (
            formatMoney(totals.shipping)
          )}
        </dd>
      </div>
      <div className="flex justify-between border-t border-line pt-3 text-base font-medium">
        <dt>Total</dt>
        <dd>{formatMoney(totals.total)}</dd>
      </div>
      {cart.tax.status === "INCLUDED" && totals.tax && totals.tax.amount > 0 && (
        <div className="flex justify-between text-xs text-muted">
          <dt>Includes GST</dt>
          <dd>{formatMoney(totals.tax)}</dd>
        </div>
      )}
      {cart.gstRemovedForExport && (
        <p className="pt-1 text-xs text-muted">
          Prices shown are for export and do not include Australian GST.
        </p>
      )}
    </dl>
  );
}
