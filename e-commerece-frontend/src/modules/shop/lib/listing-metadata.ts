import type { Metadata } from "next";
import { hasFilters, type ListingQuery } from "./listing-query";
import { absoluteUrl } from "./seo";

// Page title, description, canonical address and sharing picture for a collection or category.
// Filtered or re-sorted versions of a page are kept out of Google, so the one clean page ranks.
export function listingMetadata(args: {
  title: string;
  description?: string;
  image?: string | null;
  basePath: string;
  query: ListingQuery;
}): Metadata {
  const { title, description, image, basePath, query } = args;
  const canonical = query.page > 1 ? `${basePath}?page=${query.page}` : basePath;
  const variant = hasFilters(query) || query.sort !== undefined;

  return {
    title,
    description,
    alternates: { canonical },
    robots: variant ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      title,
      description,
      url: absoluteUrl(canonical),
      images: image ? [{ url: image }] : undefined,
    },
  };
}
