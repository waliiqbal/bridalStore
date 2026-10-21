import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutSuccess } from "@/modules/checkout/components/CheckoutSuccess";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ order?: string | string[] }> };

export default async function Page({ searchParams }: Props) {
  const raw = (await searchParams).order;
  const orderNumber = (Array.isArray(raw) ? raw[0] : raw)?.trim();

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-8 lg:px-6">
      {orderNumber ? (
        <CheckoutSuccess orderNumber={orderNumber} />
      ) : (
        <p className="py-24 text-center text-muted">
          We couldn&apos;t find an order to show.{" "}
          <Link href="/" className="underline underline-offset-4 hover:text-gold">
            Back to the shop
          </Link>
        </p>
      )}
    </div>
  );
}
