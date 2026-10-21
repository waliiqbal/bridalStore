import { getSelectedCurrency } from "@/modules/currency/server";
import { ShopShell } from "@/shared/layouts/ShopShell";

// The account pages use the same header and footer as the shop.
export default async function AccountRootLayout({ children }: { children: React.ReactNode }) {
  const { code } = await getSelectedCurrency();
  return <ShopShell currency={code}>{children}</ShopShell>;
}
