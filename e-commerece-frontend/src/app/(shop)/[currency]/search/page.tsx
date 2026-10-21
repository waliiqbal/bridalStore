import { ProductGrid } from "@/modules/shop/components/ProductGrid";
import type { Metadata } from "next";
import Link from "next/link";
import { LuSearch } from "react-icons/lu";
import { apiFetch } from "@/infrastructure/http/api-client";
import { resolveCurrency } from "@/modules/currency/server";
import type { Paged, ProductCardData } from "@/modules/shop/types/shop";
import { SimplePagination } from "@/shared/components/SimplePagination";

const PAGE_SIZE = 24;
type Props = {
  params: Promise<{ currency: string }>;
  searchParams: Promise<{ q?: string | string[]; page?: string }>;
};

const clean = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 100) ?? "";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = clean((await searchParams).q);
  // Search results are never put in Google
  return { title: q ? `Search results for “${q}”` : "Search", robots: { index: false, follow: true } };
}

export default async function SearchPage({ params: routeParams, searchParams }: Props) {
  const params = await searchParams;
  const q = clean(params.q);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  let results: Paged<ProductCardData> | null = null;
  let failed = false;
  if (q) {
    const { code } = await resolveCurrency((await routeParams).currency);
    try {
      results = await apiFetch<Paged<ProductCardData>>(
        `/search?q=${encodeURIComponent(q)}&page=${page}&pageSize=${PAGE_SIZE}&currency=${encodeURIComponent(code)}`,
      );
    } catch {
      failed = true;
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-20 pt-8 lg:px-6">
      <h1 className="text-center font-serif text-3xl font-bold sm:text-4xl">
        {q ? "Search results" : "What are you looking for?"}
      </h1>

      <form action="/search" role="search" className="mx-auto mt-6 flex max-w-2xl gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          maxLength={100}
          placeholder="Search for a lehenga, sharara, sherwani…"
          aria-label="Search the shop"
          className="h-12 min-w-0 flex-1 rounded-sm border border-line px-4 text-base outline-none focus:border-gold"
        />
        <button
          type="submit"
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-sm bg-black px-5 text-sm font-medium uppercase tracking-wider text-white transition hover:bg-gold"
        >
          <LuSearch className="h-4 w-4" />
          Search
        </button>
      </form>

      {failed && (
        <p role="alert" className="mx-auto mt-10 max-w-md text-center text-muted">
          We couldn&apos;t search right now. Please try again in a moment.
        </p>
      )}

      {results && results.total > 0 && (
        <>
          <p className="mt-8 text-sm text-muted">
            {results.total} {results.total === 1 ? "result" : "results"} for “{q}”
          </p>
          <ProductGrid products={results.items} variant="wide" eagerFirst={4} headingLevel={2} className="mt-5" />
          <SimplePagination
            basePath="/search"
            params={{ q }}
            page={results.page}
            pageSize={results.pageSize}
            total={results.total}
          />
        </>
      )}

      {results && results.total === 0 && (
        <div className="mx-auto mt-10 max-w-md text-center">
          <p className="font-serif text-xl font-bold">No results for “{q}”</p>
          <p className="mt-2 text-sm text-muted">
            Check the spelling, or try a shorter word such as “lehenga” or “red”. You can also{" "}
            <Link href="/" className="underline underline-offset-4 hover:text-gold">
              browse the shop
            </Link>{" "}
            or{" "}
            <Link href="/enquiry" className="underline underline-offset-4 hover:text-gold">
              tell us what you are looking for
            </Link>
            .
          </p>
        </div>
      )}

      {!q && (
        <p className="mt-8 text-center text-sm text-muted">
          Type a word above, like the name of an outfit, a colour or an occasion.
        </p>
      )}
    </div>
  );
}
