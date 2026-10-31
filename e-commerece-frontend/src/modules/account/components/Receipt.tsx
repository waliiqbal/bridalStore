import { brand } from "@/config/brand";
import { Logo } from "@/shared/components/Logo";
import type { OrderStatus } from "../types/account";

// A receipt is the order page itself, printed: the browser's print window has "Save as PDF" on
// phones and computers (ReceiptButton opens it). The site's header, footer and buttons are hidden
// when printing (`print:hidden`) and ReceiptHeading appears in their place.

// What the shop puts at the top of a receipt (from Settings)
export interface ReceiptShop {
  name: string;
  email: string | null;
  phone: string | null;
}

export function receiptShop(
  settings: { storeName: string; contactEmail: string | null; contactPhone: string | null } | null,
): ReceiptShop {
  return {
    name: settings?.storeName ?? brand.name,
    email: settings?.contactEmail ?? null,
    phone: settings?.contactPhone ?? null,
  };
}

// Offered once the order is paid (not while waiting, cancelled or refunded)
const PAID: OrderStatus[] = ["PROCESSING", "SHIPPED", "DELIVERED"];
export const hasReceipt = (status: OrderStatus) => PAID.includes(status);

// Only on paper / in the PDF: the shop's name and how to reach it
export function ReceiptHeading({ shop }: { shop: ReceiptShop }) {
  return (
    <div className="mb-6 hidden items-start justify-between gap-6 border-b border-line pb-4 print:flex">
      <div>
        <Logo size="sm" />
        <p className="mt-2 text-sm font-medium">{shop.name}</p>
        <p className="text-xs text-muted">{[shop.email, shop.phone].filter(Boolean).join(" · ")}</p>
      </div>
      <p className="font-serif text-2xl font-bold">Receipt</p>
    </div>
  );
}
