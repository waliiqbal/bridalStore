import Image from "next/image";
import Link from "next/link";
import type { PublicSection } from "../../types/page";
import { ProductScroller } from "./ProductScroller";
import { SectionHeader } from "./SectionHeader";

// Picture tiles that open collections (e.g. Eid Edit, Nikah Edit). Each tile uses the collection's
// own picture, so the owner changes it in the collection, not here.
export function TilesBlock({ section }: { section: PublicSection }) {
  const tiles = section.collections ?? [];
  if (tiles.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 lg:px-6">
      <SectionHeader title={section.title} subtitle={section.subtitle} center />
      <ProductScroller label={section.title ?? "Collections"}>
        {tiles.map((tile) => {
          const picture = tile.tileImageUrl ?? tile.mobileImageUrl ?? tile.imageUrl;
          return (
            <li
              key={tile.slug}
              className="w-[calc(50%-0.375rem)] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]"
            >
              <Link href={`/${tile.kind === "category" ? "categories" : "collections"}/${tile.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-cream">
                {picture && (
                  <Image
                    src={picture}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                )}
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent"
                />
                <span className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                  <span className="block font-serif text-xl text-white sm:text-2xl">{tile.title}</span>
                  <span className="mt-1 block text-xs uppercase tracking-widest text-white/85 underline-offset-4 group-hover:underline">
                    Shop now
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ProductScroller>
    </section>
  );
}
