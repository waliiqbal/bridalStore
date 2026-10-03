"use client";

import { useState } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { Placeholder } from "@/shared/components/Placeholder";
import { SectionHeading } from "@/shared/components/SectionHeading";

export type TrendingItem = {
  name: string;
  href?: string;
  /** Path to a video in /public (e.g. "/videos/look-1.mp4"). Plays when the card is selected. */
  videoSrc?: string;
};

type Props = { title?: string; items: TrendingItem[] };

// Position of each card relative to the selected one: 0 = selected, ±1, ±2 = neighbours
const style = (offset: number) => {
  const abs = Math.abs(offset);
  return {
    transform: `translateX(calc(var(--step) * ${offset})) scale(${
      abs === 0 ? 1.08 : abs === 1 ? 0.95 : 0.85
    })`,
    zIndex: 10 - abs,
    opacity: abs === 0 ? 1 : abs === 1 ? 0.6 : 0.4,
  };
};

export function TrendingCarousel({ title = "Trending Styles", items }: Props) {
  const [active, setActive] = useState(Math.floor(items.length / 2));
  const count = items.length;

  const move = (dir: number) => setActive((i) => (i + dir + count) % count);

  // Shortest circular distance from the active card, e.g. -2..2 for 5 visible cards
  const offsetOf = (i: number) => {
    let d = i - active;
    if (d > count / 2) d -= count;
    if (d < -count / 2) d += count;
    return d;
  };

  return (
    <section className="overflow-hidden pt-10">
      <SectionHeading title={title} />

      <div className="relative mx-auto h-[340px] max-w-4xl [--step:95px] sm:h-[430px] sm:[--step:130px] md:[--step:165px]">
        {items.map((item, i) => {
          const offset = offsetOf(i);
          if (Math.abs(offset) > 2) return null;
          const selected = offset === 0;

          return (
            <div
              key={item.name}
              onClick={() => !selected && setActive(i)}
              style={style(offset)}
              className={`absolute left-1/2 top-4 -ml-[85px] h-[290px] w-[170px] overflow-hidden rounded-2xl transition-all duration-500 sm:-ml-[110px] sm:h-[380px] sm:w-[220px] ${
                selected ? "shadow-2xl" : "cursor-pointer"
              } ${Math.abs(offset) === 2 ? "hidden sm:block" : ""}`}
            >
              {selected && item.videoSrc ? (
                <video
                  key={item.videoSrc}
                  src={item.videoSrc}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <Placeholder
                  index={i}
                  className={`h-full w-full ${selected ? "animate-pulse" : ""}`}
                />
              )}

              {selected && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 pt-12 text-white">
                  <p className="mb-2 truncate text-xs sm:text-sm">{item.name}</p>
                  <a
                    href={item.href ?? "#"}
                    className="block bg-black py-2 text-center text-xs underline sm:text-sm"
                  >
                    View
                  </a>
                </div>
              )}
            </div>
          );
        })}

        <button
          aria-label="Previous"
          onClick={() => move(-1)}
          className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-500/70 text-white hover:bg-neutral-600 md:left-6"
        >
          <LuChevronLeft className="h-6 w-6" />
        </button>
        <button
          aria-label="Next"
          onClick={() => move(1)}
          className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-500/70 text-white hover:bg-neutral-600 md:right-6"
        >
          <LuChevronRight className="h-6 w-6" />
        </button>
      </div>
    </section>
  );
}
