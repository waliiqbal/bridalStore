"use client";

import { LuHeart } from "react-icons/lu";
import { useShopper } from "@/modules/account/components/ShopperProvider";

// The heart on a product card or product page.
export function WishlistButton({
  productId,
  productName,
  className = "",
}: {
  productId: string;
  productName: string;
  className?: string;
}) {
  const { isSaved, toggle } = useShopper();
  const saved = isSaved(productId);

  return (
    <button
      type="button"
      onClick={() => toggle(productId)}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${productName} from your wishlist` : `Save ${productName} to your wishlist`}
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:bg-white ${className}`}
    >
      <LuHeart className={`h-5 w-5 ${saved ? "fill-red-600 text-red-600" : "text-foreground"}`} />
    </button>
  );
}
