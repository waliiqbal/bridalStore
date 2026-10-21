import { ProductGrid } from "@/modules/shop/components/ProductGrid";
import type { Metadata } from "next";
import Link from "next/link";
import { LuHeart } from "react-icons/lu";
import { requireCustomer, accountGet } from "@/modules/account/server";
import { resolveCurrency } from "@/modules/currency/server";
import type { Paged, ProductCardData } from "@/modules/shop/types/shop";
import { SimplePagination } from "@/shared/components/SimplePagination";

export const metadata: Metadata = { title: "My wishlist", robots: { index: false, follow: false } };

const PAGE_SIZE = 24;
type Props = { params: Promise<{ currency: string }>; searchParams: Promise<{ page?: string }> };

export default async function WishlistPage({ params, searchParams }: Props) {
  await requireCustomer("/wishlist");
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);
  const { code } = await resolveCurrency((await params).currency);
  const wishlist = await accountGet<Paged<ProductCardData>>(
    `/account/wishlist?page=${page}&pageSize=${PAGE_SIZE}&currency=${encodeURIComponent(code)}`,
    "/wishlist",
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-20 pt-8 lg:px-6">
      <h1 className="font-serif text-3xl font-bold sm:text-4xl">My wishlist</h1>
      <p className="mt-1 text-sm text-muted">
        {wishlist.total === 0
          ? "Outfits you save will appear here."
          : `${wishlist.total} saved ${wishlist.total === 1 ? "outfit" : "outfits"}`}
      </p>

      {wishlist.items.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-line bg-cream/50 px-6 py-16 text-center">
          <LuHeart className="mx-auto h-10 w-10 text-gold" aria-hidden />
          <p className="mt-3 font-serif text-xl font-bold">Nothing saved yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
            Tap the heart on any outfit to save it here and find it again later.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center bg-black px-7 text-sm font-medium uppercase tracking-wider text-white transition hover:bg-gold"
          >
            Browse the shop
          </Link>
        </div>
      ) : (
        <>
          <ProductGrid products={wishlist.items} variant="wide" eagerFirst={4} headingLevel={2} className="mt-8" />
          <SimplePagination
            basePath="/wishlist"
            page={wishlist.page}
            pageSize={wishlist.pageSize}
            total={wishlist.total}
          />
        </>
      )}
    </div>
  );
}
