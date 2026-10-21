import { resolveCurrency } from "@/modules/currency/server";
import { ShopShell } from "@/shared/layouts/ShopShell";

// Every shop page lives under a hidden "/[currency]" part of its address (the proxy adds it, see
// src/proxy.ts), so it can be built once per currency instead of once per visitor.
// These are built ahead of time; a currency the owner adds later is built on its first visit.
export async function generateStaticParams() {
  const { currencies } = await resolveCurrency(undefined);
  return currencies.map((currency) => ({ currency: currency.code }));
}

export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ currency: string }>;
}) {
  const { currency } = await params;
  return <ShopShell currency={currency}>{children}</ShopShell>;
}
