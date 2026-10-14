"use client";

import { useRouter } from "next/navigation";
import { LuGlobe } from "react-icons/lu";
import type { CurrencyOption } from "@/modules/shop/types/shop";
import { CURRENCY_COOKIE } from "../constants";

// Pick the currency prices are shown in. Remembered for a year, then the page refreshes.
export function CurrencySwitcher({ currencies, current }: { currencies: CurrencyOption[]; current: string }) {
  const router = useRouter();
  if (currencies.length < 2) return null;

  return (
    <label className="flex items-center gap-1.5 text-sm">
      <LuGlobe className="h-5 w-5 shrink-0" aria-hidden />
      <span className="sr-only">Currency</span>
      <select
        value={current}
        onChange={(event) => {
          document.cookie = `${CURRENCY_COOKIE}=${event.target.value}; path=/; max-age=31536000; samesite=lax`;
          router.refresh();
        }}
        className="cursor-pointer bg-transparent py-1 pr-1 outline-none hover:text-gold"
      >
        {currencies.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.code}
          </option>
        ))}
      </select>
    </label>
  );
}
