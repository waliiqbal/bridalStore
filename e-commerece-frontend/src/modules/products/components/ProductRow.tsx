import { ScrollRow } from "@/shared/components/ScrollRow";
import { SectionHeading } from "@/shared/components/SectionHeading";
import { ProductCard } from "./ProductCard";

type Props = { title: string; subtitle?: string; items: string[]; offset?: number };

export function ProductRow({ title, subtitle, items, offset = 0 }: Props) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16">
      <SectionHeading title={title} subtitle={subtitle} />
      <ScrollRow>
        {items.map((name, i) => (
          <ProductCard
            key={name + i}
            name={name}
            price={`$${120 + ((i * 37) % 300)}`}
            index={i + offset}
          />
        ))}
      </ScrollRow>
    </section>
  );
}
