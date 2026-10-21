import type { Metadata } from "next";
import { CurrenciesManager } from "@/modules/currencies/components/CurrenciesManager";

export const metadata: Metadata = { title: "Currencies" };

export default function CurrenciesPage() {
  return <CurrenciesManager />;
}
