"use client";

import { FormError } from "@/shared/components/FormError";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuX } from "react-icons/lu";
import { formatMoney } from "@/shared/lib/money";
import { CartLineList } from "./CartLineList";
import { CheckoutLink } from "./CheckoutLink";
import { useCart } from "./CartProvider";
import { EmptyBag } from "./EmptyBag";

// The bag as a panel that slides in from the right. Opens when something is added.
// (Loaded only when first opened, see CartProvider.)
export default function CartDrawer() {
  const { cart, closeDrawer, error } = useCart();
  const pathname = usePathname();
  const closeButton = useRef<HTMLButtonElement>(null);

  // Going to another page closes it
  const opened = useRef(pathname);
  useEffect(() => {
    if (pathname !== opened.current) closeDrawer();
  }, [pathname, closeDrawer]);

  // Esc closes, the page behind doesn't scroll, and the close button gets the focus
  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && closeDrawer();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [closeDrawer]);

  const empty = !cart || cart.items.length === 0;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close bag"
        onClick={closeDrawer}
        className="absolute inset-0 cursor-default bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your bag"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-serif text-xl font-bold">
            Your bag{cart && cart.itemCount > 0 ? ` (${cart.itemCount})` : ""}
          </h2>
          <button
            ref={closeButton}
            type="button"
            onClick={closeDrawer}
            aria-label="Close bag"
            className="p-2"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        {empty ? (
          <div className="flex-1 overflow-y-auto">
            <EmptyBag onNavigate={closeDrawer} />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4">
              {error && (
                <FormError className="mt-3">
                  {error}
                </FormError>
              )}
              {cart.notice && (
                <p className="mt-3 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {cart.notice}
                </p>
              )}
              <CartLineList cart={cart} onNavigate={closeDrawer} />
            </div>
            <div className="space-y-3 border-t border-line px-4 py-4">
              <p className="flex justify-between text-base font-medium">
                <span>Subtotal</span>
                <span>{formatMoney(cart.totals.subtotal)}</span>
              </p>
              <p className="text-xs text-muted">Shipping and discount codes are added at checkout.</p>
              <CheckoutLink cart={cart} onNavigate={closeDrawer} />
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="block text-center text-sm underline underline-offset-4 hover:text-gold"
              >
                View full bag
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
