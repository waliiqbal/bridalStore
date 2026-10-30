"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { AE, AU, CA, EU, GB, NZ, PK, SA, SG, US } from "country-flag-icons/react/3x2";
import { LuCheck, LuChevronDown, LuGlobe } from "react-icons/lu";
import type { CurrencyOption } from "@/modules/shop/types/shop";
import { CURRENCY_COOKIE } from "../constants";

// The country flag shown for each currency. A currency without a flag here shows a globe.
const FLAGS: Record<string, ComponentType<{ className?: string; title?: string }>> = {
  AUD: AU,
  CAD: CA,
  GBP: GB,
  NZD: NZ,
  USD: US,
  EUR: EU,
  PKR: PK,
  AED: AE,
  SAR: SA,
  SGD: SG,
};

function Flag({ code, className }: { code: string; className: string }) {
  const Icon = FLAGS[code];
  if (!Icon) return <LuGlobe className={className} aria-hidden />;
  return (
    <span aria-hidden className={`inline-flex overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] ${className}`}>
      <Icon className="h-full w-full" />
    </span>
  );
}

function rememberCurrency(code: string) {
  document.cookie = `${CURRENCY_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
}

// Pick the currency prices are shown in. Remembered for a year, then the page refreshes.
// `compact` shows only the flag (header); otherwise the flag and the code (phone menu).
export function CurrencySwitcher({
  currencies,
  current,
  compact = false,
}: {
  currencies: CurrencyOption[];
  current: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Close on a click outside or Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (currencies.length < 2) return null;

  function choose(code: string) {
    setOpen(false);
    if (code === current) return;
    rememberCurrency(code);
    router.refresh();
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Prices shown in ${current}. Change currency`}
        className="flex h-10 items-center gap-1.5 rounded-sm px-1.5 text-sm hover:text-gold"
      >
        <Flag code={current} className="h-[18px] w-[27px]" />
        {!compact && <span className="font-medium">{current}</span>}
        <LuChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Currency"
          className="absolute right-0 top-full z-50 mt-1 min-w-40 overflow-hidden rounded-md border border-line bg-white py-1 shadow-lg"
        >
          {currencies.map((currency) => {
            const selected = currency.code === current;
            return (
              <li key={currency.code} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => choose(currency.code)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-cream ${
                    selected ? "font-semibold" : ""
                  }`}
                >
                  <Flag code={currency.code} className="h-[14px] w-[21px]" />
                  <span className="flex-1">
                    {currency.code} <span className="text-muted">{currency.symbol}</span>
                  </span>
                  {selected && <LuCheck className="h-4 w-4 text-gold" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
