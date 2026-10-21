import type { Metadata } from "next";
import { CartPage } from "@/modules/cart/components/CartPage";

export const metadata: Metadata = { title: "Your bag", robots: { index: false, follow: false } };

// The page itself is built once and shared. The bag is fetched in the browser (it is personal).
export default function Page() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-8 lg:px-6">
      <h1 className="mb-6 font-serif text-3xl font-bold sm:text-4xl">Your bag</h1>
      <CartPage />
    </div>
  );
}
