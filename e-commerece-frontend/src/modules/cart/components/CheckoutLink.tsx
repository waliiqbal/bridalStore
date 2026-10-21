import Link from "next/link";
import type { CartView } from "../types/cart";

// The big "Checkout" button. Greyed out (with the reason nearby) while something in the bag
// needs fixing, so nobody reaches the checkout with a bag that can't be bought.
export function CheckoutLink({ cart, onNavigate }: { cart: CartView; onNavigate?: () => void }) {
  const base =
    "flex h-14 w-full items-center justify-center text-sm font-medium uppercase tracking-wider text-white";
  if (!cart.canCheckout) {
    return (
      <span aria-disabled="true" className={`${base} cursor-not-allowed bg-black opacity-40`}>
        Checkout
      </span>
    );
  }
  return (
    <Link href="/checkout" onClick={onNavigate} className={`${base} bg-black transition hover:bg-gold`}>
      Checkout
    </Link>
  );
}
