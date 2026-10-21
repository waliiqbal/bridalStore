import type { ProductCardData } from "../types/shop";
import { ProductGrid } from "./ProductGrid";

export function RelatedProducts({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="mt-20 border-t border-line pt-10">
      <h2 id="related-heading" className="mb-6 font-serif text-2xl font-bold">
        You may also like
      </h2>
      <ProductGrid products={products} />
    </section>
  );
}
