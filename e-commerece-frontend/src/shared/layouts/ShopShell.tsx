import type { ReactNode } from "react";
import { ShopperProvider } from "@/modules/account/components/ShopperProvider";
import { CartProvider } from "@/modules/cart/components/CartProvider";
import { FloatingActions } from "./FloatingActions";
import { Footer } from "./Footer";
import { Header } from "./Header";

// Header, page and footer, shared by the shop and the account pages. The shopper provider
// wraps all of it so the header icons and the hearts on products always agree.
// It reads no cookies: `currency` is passed in, so the shop's pages can be built once and shared.
export function ShopShell({ children, currency }: { children: ReactNode; currency: string }) {
  return (
    <ShopperProvider>
      <CartProvider currency={currency}>
        <Header currency={currency} />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingActions />
      </CartProvider>
    </ShopperProvider>
  );
}
