import { cookies } from "next/headers";
import { getCurrencies } from "@/modules/shop/api/shop.api";
import type { CurrencyOption } from "@/modules/shop/types/shop";
import { CURRENCY_COOKIE } from "./constants";

export interface SelectedCurrency {
  code: string;
  currencies: CurrencyOption[];
}

// The currency prices should be shown in: the shopper's choice if it's still on offer,
// otherwise the store default (AUD). If the list can't be loaded, fall back to AUD quietly.
export async function getSelectedCurrency(): Promise<SelectedCurrency> {
  const [store, currencies] = await Promise.all([
    cookies(),
    getCurrencies().catch((): CurrencyOption[] => []),
  ]);
  const wanted = store.get(CURRENCY_COOKIE)?.value;
  const chosen =
    currencies.find((c) => c.code === wanted) ?? currencies.find((c) => c.isDefault) ?? currencies[0];
  return { code: chosen?.code ?? "AUD", currencies };
}
