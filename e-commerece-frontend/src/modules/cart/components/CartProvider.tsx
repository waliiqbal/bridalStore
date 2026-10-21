"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useShopper } from "@/modules/account/components/ShopperProvider";
import {
  addToCart,
  applyCouponCode,
  getCart,
  removeCouponCode,
  removeLine,
  setLineQuantity,
} from "../api/cart.api";
import { cartHint } from "../hint";
import type { CartView } from "../types/cart";

// The side panel is only needed once someone opens the bag, so its code loads then
const CartDrawer = dynamic(() => import("./CartDrawer"));

interface CartState {
  // The priced bag, or null before it has been fetched (or when nothing was ever added)
  cart: CartView | null;
  itemCount: number;
  // False until we know whether there is a bag, so pages don't flash "empty" for a second
  ready: boolean;
  // A change is being sent to the server
  busy: boolean;
  // The server's reason when something couldn't be done ("Only 2 available.")
  error: string | null;
  clearError: () => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  // These return true when the server accepted the change
  add: (variantId: string, quantity?: number) => Promise<boolean>;
  setQuantity: (lineId: string, quantity: number) => Promise<boolean>;
  remove: (lineId: string) => Promise<boolean>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => Promise<boolean>;
  // Fetch the bag again (after paying, or after signing in)
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartState | null>(null);

export function useCart(): CartState {
  const state = useContext(CartContext);
  if (!state) throw new Error("useCart must be used inside CartProvider");
  return state;
}

// The shopper's bag, for the header, the side panel, the bag page and the checkout.
//
// The bag lives on the server (the browser never decides a price). It is asked for in the
// BROWSER after the page appears, so the shop's pages can be built once and shared. Visitors
// who never added anything make no request at all (see shared/lib/hint-cookie.ts).
export function CartProvider({ currency, children }: { currency: string; children: ReactNode }) {
  const { customer } = useShopper();
  const [cart, setCart] = useState<CartView | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const keep = useCallback((next: CartView) => {
    setCart(next);
    if (next.itemCount > 0) cartHint.set();
    else cartHint.clear();
  }, []);

  const customerId = customer?.id;
  useEffect(() => {
    let current = true;
    void (async () => {
      await Promise.resolve();
      // A signed-in customer's bag follows them from other devices, so always ask for them
      if (cartHint.has() || customerId) {
        try {
          const next = await getCart({ currency });
          if (current) keep(next);
        } catch {
          // The shop can't be reached right now; the bag simply stays as it was
        }
      }
      if (current) setReady(true);
    })();
    return () => {
      current = false;
    };
  }, [currency, customerId, keep]);

  // Runs one change on the server and shows the result (or the reason it failed)
  const change = useCallback(
    async (action: () => Promise<CartView>): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        keep(await action());
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [keep],
  );

  const pricing = useMemo(() => ({ currency }), [currency]);

  // Every action keeps the same identity between renders. Components put these in effects, and an
  // action that changed on every render would make those effects run again and again (the
  // "thank you" page once asked the server to confirm the payment in a loop because of this).
  const clearError = useCallback(() => setError(null), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const add = useCallback(
    async (variantId: string, quantity = 1) => {
      const ok = await change(() => addToCart(variantId, quantity, pricing));
      if (ok) setDrawerOpen(true);
      return ok;
    },
    [change, pricing],
  );
  const setQuantity = useCallback(
    (lineId: string, quantity: number) => change(() => setLineQuantity(lineId, quantity, pricing)),
    [change, pricing],
  );
  const remove = useCallback(
    (lineId: string) => change(() => removeLine(lineId, pricing)),
    [change, pricing],
  );
  const applyCoupon = useCallback(
    (code: string) => change(() => applyCouponCode(code, pricing)),
    [change, pricing],
  );
  const removeCoupon = useCallback(() => change(() => removeCouponCode(pricing)), [change, pricing]);
  const refresh = useCallback(async () => {
    try {
      keep(await getCart(pricing));
    } catch {
      // keep what we have
    }
  }, [keep, pricing]);

  const value = useMemo<CartState>(
    () => ({
      cart,
      itemCount: cart?.itemCount ?? 0,
      ready,
      busy,
      error,
      clearError,
      drawerOpen,
      openDrawer,
      closeDrawer,
      add,
      setQuantity,
      remove,
      applyCoupon,
      removeCoupon,
      refresh,
    }),
    [
      cart,
      ready,
      busy,
      error,
      drawerOpen,
      clearError,
      openDrawer,
      closeDrawer,
      add,
      setQuantity,
      remove,
      applyCoupon,
      removeCoupon,
      refresh,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      {drawerOpen && <CartDrawer />}
    </CartContext.Provider>
  );
}
