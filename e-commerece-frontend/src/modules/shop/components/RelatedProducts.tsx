import type { ProductCardData } from "../types/shop";
import { ProductCard } from "./ProductCard";

export function RelatedProducts({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="mt-20 border-t border-line pt-10">
      <h2 id="related-heading" className="mb-6 font-serif text-2xl font-bold">
        You may also like
      </h2>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-4 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
