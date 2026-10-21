"use client";

import Link from "next/link";
import { LuUser } from "react-icons/lu";
import { useShopper } from "@/modules/account/components/ShopperProvider";

// "Sign in" / "My account" inside the phone menu (on phones the header has no room for it).
export function MobileAccountLink() {
  const { customer } = useShopper();
  return (
    <Link
      href={customer ? "/account/orders" : "/login"}
      className="flex items-center gap-2 text-[15px] hover:text-gold"
    >
      <LuUser className="h-5 w-5" />
      {customer ? "My account" : "Sign in"}
    </Link>
  );
}
