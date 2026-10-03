"use client";

import { useRef } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { Placeholder } from "@/shared/components/Placeholder";

export type CarouselProduct = {
  name: string;
  price: string;
  href?: string;
};

type Props = { title: string; items: CarouselProduct[]; offset?: number };

export function ProductCarousel({ title, items, offset = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section className="mx-auto max-w-[1350px] px-4 pt-8 lg:px-8">
      <h2 className="mb-3 text-center text-xl sm:text-2xl">{title}</h2>

      <div className="relative">
        <div
          ref={ref}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth lg:gap-4"
        >
          {items.map((p, i) => (
            <a
              key={p.name}
              href={p.href ?? "#"}
              className="group block w-[calc((100%-12px)/2)] shrink-0 snap-start sm:w-[calc((100%-24px)/3)] lg:w-[calc((100%-64px)/5)]"
            >
              <div className="overflow-hidden rounded-md">
                <Placeholder
                  index={i + offset}
                  className="aspect-[3/4] w-full transition duration-500 group-hover:scale-105"
                />
              </div>
              <h3 className="mt-2 truncate text-[13px]">{p.name}</h3>
              <p className="mt-2 text-sm">{p.price}</p>
            </a>
          ))}
        </div>

        <button
          aria-label="Previous"
          onClick={() => scroll(-1)}
          className="absolute left-0 top-[38%] hidden h-12 w-9 items-center justify-center bg-white/90 hover:bg-white lg:flex"
        >
          <LuChevronLeft className="h-7 w-7 stroke-1" />
        </button>
        <button
          aria-label="Next"
          onClick={() => scroll(1)}
          className="absolute right-0 top-[38%] hidden h-12 w-9 items-center justify-center bg-white/90 hover:bg-white lg:flex"
        >
          <LuChevronRight className="h-7 w-7 stroke-1" />
        </button>
      </div>
    </section>
  );
}
