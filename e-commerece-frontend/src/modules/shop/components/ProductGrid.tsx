import type { ProductCardData } from "../types/shop";
import { ProductCard } from "./ProductCard";

// How many columns fit at each width. "sidebar" is for pages with a filter column beside the grid.
const COLUMNS = {
  standard: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  wide: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  sidebar: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4",
} as const;

// The grid of product cards used on listings, search, wishlist, related products and the homepage.
export function ProductGrid({
  products,
  variant = "standard",
  eagerFirst = 0,
  headingLevel,
  className = "",
}: {
  products: ProductCardData[];
  variant?: keyof typeof COLUMNS;
  // The first few photos load straight away (the top of the page); the rest load as you scroll
  eagerFirst?: number;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  return (
    <ul className={`grid gap-x-3 gap-y-9 sm:gap-x-4 ${COLUMNS[variant]} ${className}`.trim()}>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} eager={index < eagerFirst} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
