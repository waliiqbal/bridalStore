"use client";

import { FormError } from "@/shared/components/FormError";
import Link from "next/link";
import { Skeleton, LoadingRegion } from "@/shared/components/Skeletons";
import { CartLineList } from "./CartLineList";
import { CartSummary } from "./CartSummary";
import { CheckoutLink } from "./CheckoutLink";
import { CouponForm } from "./CouponForm";
import { useCart } from "./CartProvider";
import { EmptyBag } from "./EmptyBag";

// The full bag page: the items on the left, the money and the Checkout button on the right.
export function CartPage() {
  const { cart, ready, error } = useCart();

  if (!ready) {
    return (
      <LoadingRegion label="Loading your bag">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="mt-3 h-28 w-full" />
      </LoadingRegion>
    );
  }
  if (!cart || cart.items.length === 0) return <EmptyBag />;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
      <div>
        {error && (
          <FormError className="mb-3">
            {error}
          </FormError>
        )}
        {cart.notice && (
          <p className="mb-3 rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {cart.notice}
          </p>
        )}
        <CartLineList cart={cart} />
        <Link href="/" className="mt-6 inline-block text-sm underline underline-offset-4 hover:text-gold">
          ← Continue shopping
        </Link>
      </div>

      <aside
        aria-labelledby="bag-summary"
        className="h-fit space-y-5 rounded-sm border border-line bg-white p-5 lg:sticky lg:top-32"
      >
        <h2 id="bag-summary" className="font-serif text-xl font-bold">
          Order summary
        </h2>
        <CouponForm />
        <CartSummary cart={cart} />
        <CheckoutLink cart={cart} />
        {!cart.canCheckout && (
          <p className="text-center text-xs text-red-600">
            Please fix the items marked above (change the quantity or remove them) to continue.
          </p>
        )}
        <p className="text-center text-xs text-muted">
          Shipping, GST and your final total are shown at checkout.
        </p>
      </aside>
    </div>
  );
}
