"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LuHeart, LuLogOut, LuMapPin, LuPackage, LuUser } from "react-icons/lu";
import { logout } from "../api/account.api";
import { sessionHint } from "../hint";
import { useShopper } from "./ShopperProvider";

const LINKS = [
  { href: "/account/orders", label: "My orders", icon: LuPackage },
  { href: "/account/addresses", label: "Addresses", icon: LuMapPin },
  { href: "/account/profile", label: "My details", icon: LuUser },
  { href: "/wishlist", label: "Wishlist", icon: LuHeart },
];

// Side menu on a computer, a scrolling strip of tabs on a phone.
export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { refresh } = useShopper();
  const [leaving, setLeaving] = useState(false);

  async function signOut() {
    setLeaving(true);
    try {
      await logout();
    } finally {
      sessionHint.clear();
      await refresh();
      router.replace("/");
      router.refresh();
    }
  }

  const item =
    "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-sm px-3 py-2.5 text-sm transition md:w-full";

  return (
    <nav
      aria-label="My account"
      className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0"
    >
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`${item} ${active ? "bg-black text-white" : "hover:bg-cream"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={signOut}
        disabled={leaving}
        className={`${item} text-left text-muted hover:bg-cream hover:text-foreground disabled:opacity-50 md:mt-4 md:border-t md:border-line md:pt-4`}
      >
        <LuLogOut className="h-4 w-4" />
        Sign out
      </button>
    </nav>
  );
}
