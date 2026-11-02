"use client";

import { LuDownload } from "react-icons/lu";

// Opens the browser's print window, where the customer picks "Save as PDF" (see Receipt.tsx)
export function ReceiptButton({ orderNumber }: { orderNumber: string }) {
  function download() {
    // Browsers name the PDF after the page title
    const title = document.title;
    document.title = `Receipt ${orderNumber}`;
    window.print();
    document.title = title;
  }

  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex h-12 items-center gap-2 border border-line px-6 text-sm font-medium uppercase tracking-wider transition hover:border-gold hover:text-gold print:hidden"
    >
      <LuDownload className="h-4 w-4" aria-hidden />
      Download receipt
    </button>
  );
}
