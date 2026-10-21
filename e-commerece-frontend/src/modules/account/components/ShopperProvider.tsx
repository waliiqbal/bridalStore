"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/infrastructure/http/api-client";
import { removeFromWishlist, saveToWishlist } from "../api/account.api";
import { LOGIN_PATH } from "../constants";
import { sessionHint } from "../hint";
import type { Customer } from "../types/account";

interface ShopperState {
  // The signed-in customer, or null (also while we are still finding out)
  customer: Customer | null;
  // Number of saved products (for the badge in the header)
  count: number;
  isSaved: (productId: string) => boolean;
  // Saves or un-saves. Sends a signed-out shopper to the sign-in page first.
  toggle: (productId: string) => Promise<void>;
  // Ask the server again who is signed in (after signing in or out)
  refresh: () => Promise<void>;
}

const ShopperContext = createContext<ShopperState | null>(null);

export function useShopper(): ShopperState {
  const state = useContext(ShopperContext);
  if (!state) throw new Error("useShopper must be used inside ShopperProvider");
  return state;
}

// What the server said: who is signed in and what they saved; "ended" when there is no session
// any more; null when we couldn't ask (e.g. the connection dropped), so nothing should change.
type Answer = { customer: Customer; savedIds: string[] } | "ended" | null;

async function askServer(): Promise<Answer> {
  try {
    const [me, ids] = await Promise.all([
      apiFetch<{ customer: Customer }>("/auth/me"),
      apiFetch<{ productIds: string[] }>("/account/wishlist/ids"),
    ]);
    return { customer: me.customer, savedIds: ids.productIds };
  } catch (error) {
    return error instanceof ApiError && error.status === 401 ? "ended" : null;
  }
}

// Who is signed in and which products they have saved, for the header and every heart.
//
// This is asked in the BROWSER after the page appears, not by the server while building the
// page. That is what lets the shop's pages be built once and kept ready for everyone. Visitors
// who never signed in make no request at all (see hint.ts).
export function ShopperProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [saved, setSaved] = useState<ReadonlySet<string>>(() => new Set());

  const apply = useCallback((answer: Answer) => {
    if (answer === null) return;
    if (answer === "ended") {
      sessionHint.clear();
      setCustomer(null);
      setSaved(new Set());
      return;
    }
    setCustomer(answer.customer);
    setSaved(new Set(answer.savedIds));
  }, []);

  // After signing in or out. Without the note nobody is signed in; otherwise ask the server.
  const refresh = useCallback(async () => {
    apply(sessionHint.has() ? await askServer() : "ended");
  }, [apply]);

  useEffect(() => {
    // Only asks when there is a note, so most visitors make no request here
    if (!sessionHint.has()) return;
    let current = true;
    void askServer().then((answer) => {
      if (current) apply(answer);
    });
    return () => {
      current = false;
    };
  }, [apply]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!sessionHint.has()) {
        // Come back to exactly this page, including filters or a search ("?q=lehenga")
        const here = window.location.pathname + window.location.search;
        router.push(`${LOGIN_PATH}?next=${encodeURIComponent(here)}`);
        return;
      }
      const wasSaved = saved.has(productId);
      const change = (on: boolean) =>
        setSaved((existing) => {
          const next = new Set(existing);
          if (on) next.add(productId);
          else next.delete(productId);
          return next;
        });

      change(!wasSaved);
      try {
        if (wasSaved) await removeFromWishlist(productId);
        else await saveToWishlist(productId);
        // On the wishlist page the product should disappear from the grid
        if (pathname.startsWith("/wishlist")) router.refresh();
      } catch (error) {
        change(wasSaved);
        if (error instanceof ApiError && error.status === 401) {
          apply("ended");
          router.push(`${LOGIN_PATH}?next=${encodeURIComponent(window.location.pathname)}`);
        }
      }
    },
    [saved, router, pathname, apply],
  );

  const value = useMemo<ShopperState>(
    () => ({ customer, count: saved.size, isSaved: (id) => saved.has(id), toggle, refresh }),
    [customer, saved, toggle, refresh],
  );
  return <ShopperContext.Provider value={value}>{children}</ShopperContext.Provider>;
}
