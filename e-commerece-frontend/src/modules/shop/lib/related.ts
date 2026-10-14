import { getCategoryPage } from "../api/shop.api";
import type { ProductCardData, ProductDetail } from "../types/shop";
import { parseListingQuery } from "./listing-query";

// "You may also like": other products from the same category, and if that has too few, from its
// parent category. Uses the category pages the website already has, so it needs nothing new.
export async function getRelatedProducts(
  product: ProductDetail,
  currency: string,
  wanted = 4,
): Promise<ProductCardData[]> {
  const found: ProductCardData[] = [];
  const seen = new Set([product.id]);
  const query = parseListingQuery({});

  // The deepest category first, then its parents
  for (const crumb of [...product.breadcrumb].reverse()) {
    if (found.length >= wanted) break;
    const page = await getCategoryPage(crumb.slug, query, currency).catch(() => null);
    for (const item of page?.products.items ?? []) {
      if (found.length >= wanted) break;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      found.push(item);
    }
  }
  return found;
}
