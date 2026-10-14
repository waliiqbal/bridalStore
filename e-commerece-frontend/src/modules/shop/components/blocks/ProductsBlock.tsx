import type { PublicSection } from "../../types/page";
import { ProductCard } from "../ProductCard";
import { ProductScroller } from "./ProductScroller";
import { SectionHeader } from "./SectionHeader";

// "Product slider" (a row you scroll) and "Product grid" (a neat grid) from one collection.
export function ProductsBlock({ section }: { section: PublicSection }) {
  const products = section.products ?? [];
  if (products.length === 0) return null;
  const href = section.collection ? `/collections/${section.collection.slug}` : null;
  const header = (
    <SectionHeader title={section.title} subtitle={section.subtitle} viewAllHref={href} viewAllLabel={section.buttonText} />
  );

  if (section.type === "COLLECTION_GRID") {
    return (
      <section className="mx-auto w-full max-w-[1600px] px-4 lg:px-6">
        {header}
        <ul className="grid grid-cols-2 gap-x-3 gap-y-9 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 lg:px-6">
      {header}
      <ProductScroller label={section.title ?? "Products"}>
        {products.map((product) => (
          <li key={product.id} className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[22.5%] xl:w-[19%]">
            <ProductCard product={product} />
          </li>
        ))}
      </ProductScroller>
    </section>
  );
}
