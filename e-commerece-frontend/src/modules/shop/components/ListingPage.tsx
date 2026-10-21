import { ProductGrid } from "./ProductGrid";
import Link from "next/link";
import { ArtDirectedImage } from "@/shared/components/ArtDirectedImage";
import { buildHref, hasFilters, withSort, type ListingQuery } from "../lib/listing-query";
import { breadcrumbJsonLd, jsonLdString } from "../lib/seo";
import type { ListingResponse, SortKey } from "../types/shop";
import { ActiveFilters } from "./ActiveFilters";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { FilterPanel } from "./FilterPanel";
import { FilterShell } from "./FilterShell";
import { Pagination } from "./Pagination";
import { ReadMore } from "./ReadMore";
import { SortSelect } from "./SortSelect";

const SORT_LABELS: Record<SortKey, string> = {
  MANUAL: "Featured",
  BEST_SELLING: "Best selling",
  NEWEST: "Newest first",
  PRICE_ASC: "Price: low to high",
  PRICE_DESC: "Price: high to low",
};

interface ListingPageProps {
  // The page's own address, e.g. /collections/eid-edit
  basePath: string;
  title: string;
  introHtml: string | null;
  noticeText?: string | null;
  seoHtml?: string | null;
  bannerUrl?: string | null;
  mobileBannerUrl?: string | null;
  breadcrumb: Crumb[];
  subcategories?: { name: string; slug: string }[];
  // On a category page, only the categories inside it are offered as a filter
  categoryRoot?: string;
  listing: ListingResponse;
  query: ListingQuery;
}

// The shared layout of a collection page and a category page.
export function ListingPage({
  basePath,
  title,
  introHtml,
  noticeText,
  seoHtml,
  bannerUrl,
  mobileBannerUrl,
  breadcrumb,
  subcategories = [],
  categoryRoot,
  listing,
  query,
}: ListingPageProps) {
  const { products, facets } = listing;
  const activeCount =
    query.category.length +
    query.attr.length +
    query.size.length +
    query.colour.length +
    (query.min !== undefined || query.max !== undefined ? 1 : 0) +
    (query.sale ? 1 : 0) +
    (query.ready ? 1 : 0);

  const sortChoices = listing.sortOptions.map((value) => ({
    value,
    label: SORT_LABELS[value],
    href: buildHref(basePath, withSort(query, value)),
  }));
  const total = products.total;
  const resultsLabel = `${total} product${total === 1 ? "" : "s"}`;

  // Search-engine breadcrumb: every crumb with a link, plus this page
  const jsonLd = breadcrumbJsonLd([
    ...breadcrumb.filter((c) => c.href).map((c) => ({ name: c.name, path: c.href! })),
    { name: title, path: basePath },
  ]);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-16 lg:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />

      <Breadcrumbs trail={breadcrumb} />

      {bannerUrl ? (
        <div className="relative mb-6 flex h-44 items-end overflow-hidden bg-cream sm:h-64">
          {/* The banner is the biggest thing at the top of the page, so it loads first */}
          <ArtDirectedImage
            desktopSrc={bannerUrl}
            mobileSrc={mobileBannerUrl}
            eager
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
          />
          <h1 className="relative px-5 pb-5 font-serif text-3xl font-bold text-white sm:px-8 sm:pb-7 sm:text-5xl">
            {title}
          </h1>
        </div>
      ) : (
        <h1 className="mb-4 font-serif text-3xl font-bold sm:text-4xl">{title}</h1>
      )}

      {introHtml && (
        <div className="richtext mb-4 max-w-3xl" dangerouslySetInnerHTML={{ __html: introHtml }} />
      )}
      {noticeText && <p className="mb-4 bg-cream px-4 py-2.5 text-center text-sm">{noticeText}</p>}

      {subcategories.length > 0 && (
        <ul className="mb-6 flex flex-wrap gap-2" aria-label="Sub-categories">
          {subcategories.map((sub) => (
            <li key={sub.slug}>
              <Link
                href={`/categories/${sub.slug}`}
                className="block border border-line px-4 py-2 text-sm hover:border-gold hover:text-gold"
              >
                {sub.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <FilterShell
        activeCount={activeCount}
        resultsLabel={resultsLabel}
        toolbarRight={<SortSelect options={sortChoices} current={listing.sort} />}
        sidebar={
          <FilterPanel basePath={basePath} query={query} facets={facets} categoryRoot={categoryRoot} />
        }
      >
        <ActiveFilters basePath={basePath} query={query} facets={facets} />

        {products.items.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-serif text-2xl font-bold">
              {hasFilters(query) ? "No products match these filters" : "No products here yet"}
            </p>
            <p className="mt-2 text-sm text-muted">
              {hasFilters(query)
                ? "Try removing a filter."
                : "Please check back soon, or browse another collection."}
            </p>
            {(hasFilters(query) || query.page > 1) && (
              <Link
                href={basePath}
                className="mt-6 inline-block bg-black px-6 py-3 text-sm font-medium uppercase tracking-wider text-white hover:bg-gold"
              >
                {hasFilters(query) ? "Clear all filters" : "Back to the first page"}
              </Link>
            )}
          </div>
        ) : (
          <ProductGrid products={products.items} variant="sidebar" eagerFirst={4} headingLevel={2} />
        )}

        <Pagination
          basePath={basePath}
          query={query}
          page={products.page}
          pageSize={products.pageSize}
          total={total}
        />
      </FilterShell>

      {seoHtml && (
        <section aria-label={`About ${title}`} className="mx-auto mt-16 max-w-3xl border-t border-line pt-8">
          <ReadMore html={seoHtml} />
        </section>
      )}
    </div>
  );
}
