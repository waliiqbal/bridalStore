"use client";

import { useRef } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { Placeholder } from "@/shared/components/Placeholder";
import { SectionHeading } from "@/shared/components/SectionHeading";

export type PromoTile = { title: string; href?: string };

type Props = {
  items: PromoTile[];
  title?: string;
  offset?: number;
  /** Turns the row into a horizontal carousel with prev/next arrows */
  scrollable?: boolean;
};

export function PromoTiles({ items, title, offset = 0, scrollable = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section className={`px-2 lg:px-3 ${title ? "pt-14" : ""}`}>
      {title && <SectionHeading title={title} />}

      <div className="relative">
        <div
          ref={ref}
          className={`flex gap-3 lg:gap-4 ${
            scrollable
              ? "no-scrollbar snap-x snap-mandatory overflow-x-auto scroll-smooth"
              : "flex-wrap"
          }`}
        >
          {items.map((t, i) => (
            <a
              key={t.title}
              href={t.href ?? "#"}
              className="group relative block w-[calc((100%-12px)/2)] shrink-0 snap-start overflow-hidden lg:w-[calc((100%-48px)/4)]"
            >
              <Placeholder
                index={i + offset}
                className="aspect-[3/4] w-full transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-4 pb-6 pt-24 text-center">
                <h3 className="font-serif text-xl leading-tight text-white sm:text-2xl lg:text-3xl">
                  {t.title}
                </h3>
                <span className="bg-white px-8 py-3 text-sm uppercase tracking-wide text-black transition group-hover:bg-neutral-100 sm:px-12 sm:text-base">
                  Shop Now
                </span>
              </div>
            </a>
          ))}
        </div>

        {scrollable && (
          <>
            <button
              aria-label="Previous"
              onClick={() => scroll(-1)}
              className="absolute left-0 top-[45%] z-10 hidden h-16 w-12 items-center justify-center bg-white/90 hover:bg-white lg:flex"
            >
              <LuChevronLeft className="h-8 w-8 stroke-1" />
            </button>
            <button
              aria-label="Next"
              onClick={() => scroll(1)}
              className="absolute right-0 top-[45%] z-10 hidden h-16 w-12 items-center justify-center bg-white/90 hover:bg-white lg:flex"
            >
              <LuChevronRight className="h-8 w-8 stroke-1" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
