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
      className="relative hidden h-9 w-9 items-center justify-center hover:text-gold sm:flex"
    >
      <LuHeart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[10px] font-medium text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
