import type { Metadata } from "next";
import { CheckoutPage } from "@/modules/checkout/components/CheckoutPage";
import { resolveCurrency } from "@/modules/currency/server";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

// The page itself is built once and shared; the bag and the customer are fetched in the browser.
export default async function Page({ params }: { params: Promise<{ currency: string }> }) {
  const { code } = await resolveCurrency((await params).currency);
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-8 lg:px-6">
      <h1 className="mb-8 font-serif text-3xl font-bold sm:text-4xl">Checkout</h1>
      <CheckoutPage currency={code} />
    </div>
  );
}
