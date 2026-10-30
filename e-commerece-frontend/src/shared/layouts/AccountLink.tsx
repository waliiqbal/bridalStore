"use client";

import Link from "next/link";
import { LuCircleUserRound } from "react-icons/lu";
import { useShopper } from "@/modules/account/components/ShopperProvider";

// The person icon in the header: opens the account when signed in, the sign-in page otherwise.
// (The sign-in page sends someone who is already signed in straight to their account.)
export function AccountLink() {
  const { customer } = useShopper();
  const name = customer?.firstName ?? null;
  return (
    <Link
      href={customer ? "/account/orders" : "/login"}
      aria-label={customer ? `My account${name ? `, signed in as ${name}` : ""}` : "Sign in"}
      className="relative hidden h-10 w-10 items-center justify-center hover:text-gold sm:flex"
    >
      <LuCircleUserRound className="h-6.5 w-6.5" strokeWidth={1.6} />
      {customer && (
        <span
          aria-hidden
          className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white"
        />
      )}
    </Link>
  );
}
