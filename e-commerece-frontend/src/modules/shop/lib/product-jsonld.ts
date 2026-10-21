import { centsToInputText } from "@/shared/lib/money";
import type { ProductDetail } from "../types/shop";
import { plainText } from "./seo";

// What Google reads to show price and "in stock" next to a product in search results.
// Prices are in the shopper's currency, written like "227.00".
export function productJsonLd(args: { product: ProductDetail; url: string; brandName: string }) {
  const { product, url, brandName } = args;
  const currency = product.price.currencyCode;
  const amounts =
    product.variants.length > 0 ? product.variants.map((v) => v.price.amount) : [product.price.amount];
  const low = Math.min(...amounts);
  const high = Math.max(...amounts);
  const availability = product.variants.some((v) => v.inStock)
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";

  const offers =
    low === high
      ? {
          "@type": "Offer",
          url,
          priceCurrency: currency,
          price: centsToInputText(low),
          availability,
          itemCondition: "https://schema.org/NewCondition",
        }
      : {
          "@type": "AggregateOffer",
          url,
          priceCurrency: currency,
          lowPrice: centsToInputText(low),
          highPrice: centsToInputText(high),
          offerCount: product.variants.length,
          availability,
        };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
    description: plainText(product.description, 500) || undefined,
    image: product.images.length > 0 ? product.images.map((image) => image.url) : undefined,
    sku: product.variants.length === 1 ? product.variants[0].sku : undefined,
    category: product.breadcrumb.at(-1)?.name,
    color: product.colours.length > 0 ? product.colours.join(", ") : undefined,
    brand: { "@type": "Brand", name: brandName },
    offers,
    // Stars in Google results (only once someone has reviewed it)
    aggregateRating:
      product.rating.average !== null
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating.average,
            reviewCount: product.rating.count,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };
}
