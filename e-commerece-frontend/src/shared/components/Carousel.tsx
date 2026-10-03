"use client";

import { useEffect, useState } from "react";

type Props = {
  slides: React.ReactNode[];
  interval?: number;
};

export function Carousel({ slides, interval = 5000 }: Props) {
  const [active, setActive] = useState(0);
  const count = slides.length;

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % count), interval);
    return () => clearInterval(id);
  }, [count, interval]);

  const go = (dir: number) => setActive((i) => (i + dir + count) % count);

  return (
    <div className="relative overflow-hidden">
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <div key={i} className="w-full shrink-0">
            {slide}
          </div>
        ))}
      </div>

      <button
        aria-label="Previous slide"
        onClick={() => go(-1)}
        className="absolute left-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-lg hover:bg-white md:flex"
      >
        ‹
      </button>
      <button
        aria-label="Next slide"
        onClick={() => go(1)}
        className="absolute right-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-lg hover:bg-white md:flex"
      >
        ›
      </button>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setActive(i)}
            className={`h-2 rounded-full transition-all ${
              i === active ? "w-6 bg-white" : "w-2 bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
