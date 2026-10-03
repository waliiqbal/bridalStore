"use client";

import { useRef } from "react";

export function ScrollRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth"
      >
        {children}
      </div>
      <button
        aria-label="Scroll left"
        onClick={() => scroll(-1)}
        className="absolute -left-3 top-1/3 hidden h-10 w-10 items-center justify-center rounded-full border border-line bg-white shadow md:flex"
      >
        ‹
      </button>
      <button
        aria-label="Scroll right"
        onClick={() => scroll(1)}
        className="absolute -right-3 top-1/3 hidden h-10 w-10 items-center justify-center rounded-full border border-line bg-white shadow md:flex"
      >
        ›
      </button>
    </div>
  );
}
