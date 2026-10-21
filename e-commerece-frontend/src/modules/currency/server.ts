import { cookies } from "next/headers";
import { getCurrencies } from "@/modules/shop/api/shop.api";
import type { CurrencyOption } from "@/modules/shop/types/shop";
import { CURRENCY_COOKIE, DEFAULT_CURRENCY } from "./constants";

export interface SelectedCurrency {
  code: string;
  currencies: CurrencyOption[];
}

// Checks a currency code against the list the owner has switched on. An unknown code (an old
// cookie for a currency that was removed, or a made-up one) falls back to the store default.
// Reads no cookies, so pages that use it can be built once and cached. If the list can't be
// loaded, falls back to AUD quietly.
export async function resolveCurrency(wanted: string | undefined): Promise<SelectedCurrency> {
  const currencies = await getCurrencies().catch((): CurrencyOption[] => []);
  const chosen =
    currencies.find((c) => c.code === wanted) ?? currencies.find((c) => c.isDefault) ?? currencies[0];
  return { code: chosen?.code ?? DEFAULT_CURRENCY, currencies };
}

// The same, using the shopper's cookie. ONLY for pages that are personal anyway (the account
// pages): reading a cookie makes a page render fresh for every visitor.
export async function getSelectedCurrency(): Promise<SelectedCurrency> {
  const wanted = (await cookies()).get(CURRENCY_COOKIE)?.value;
  return resolveCurrency(wanted);
}
