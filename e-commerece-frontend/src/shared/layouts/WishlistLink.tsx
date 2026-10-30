"use client";

import Link from "next/link";
import { LuHeart } from "react-icons/lu";
import { useShopper } from "@/modules/account/components/ShopperProvider";

// The heart in the header, with the number of saved outfits.
export function WishlistLink() {
  const { count } = useShopper();
  return (
    <Link
      href="/wishlist"
      aria-label={count > 0 ? `Wishlist, ${count} saved` : "Wishlist"}
      className="relative hidden h-10 w-10 items-center justify-center hover:text-gold sm:flex"
    >
      <LuHeart className="h-6.5 w-6.5" strokeWidth={1.6} />
      <span className="absolute right-0 top-0 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-white">
        {count}
      </span>
    </Link>
  );
}
