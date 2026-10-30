"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuShoppingBag } from "react-icons/lu";
import { useCart } from "@/modules/cart/components/CartProvider";

// The bag in the header, with the number of items. Opens the side panel; on the bag and
// checkout pages (where the panel would be pointless) it is a plain link to the bag.
export function CartButton() {
  const { itemCount, openDrawer } = useCart();
  const pathname = usePathname();
  const label =
    itemCount > 0 ? `Open your bag, ${itemCount} ${itemCount === 1 ? "item" : "items"}` : "Open your bag";
  const className = "relative flex h-10 w-10 items-center justify-center hover:text-gold";
  const badge = (
    <span className="absolute right-0 top-0 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-white">
      {itemCount}
    </span>
  );

  if (/^\/(cart|checkout)(\/|$)/.test(pathname)) {
    return (
      <Link href="/cart" aria-label={label} className={className}>
        <LuShoppingBag className="h-6.5 w-6.5" strokeWidth={1.6} />
        {badge}
      </Link>
    );
  }
  return (
    <button type="button" onClick={openDrawer} aria-label={label} className={className}>
      <LuShoppingBag className="h-6.5 w-6.5" strokeWidth={1.6} />
      {badge}
    </button>
  );
}
