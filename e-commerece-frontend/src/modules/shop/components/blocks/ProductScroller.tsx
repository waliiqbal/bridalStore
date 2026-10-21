"use client";

import { useRef, type ReactNode } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

// A row of products you scroll sideways: swipe on a phone, arrows on a computer.
export function ProductScroller({ children, label }: { children: ReactNode; label: string }) {
  const row = useRef<HTMLUListElement>(null);
  const scroll = (direction: 1 | -1) => {
    const el = row.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <div className="group/scroller relative">
      <ul
        ref={row}
        aria-label={label}
        // No CSS `scroll-smooth` here: together with snap scrolling it makes Chrome treat the row as
        // scrolled on load and stop measuring the page's largest paint. The arrows already scroll smoothly.
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 lg:-mx-6 lg:px-6"
      >
        {children}
      </ul>
      <button
        type="button"
        aria-label="Scroll back"
        onClick={() => scroll(-1)}
        className="absolute left-1 top-[38%] hidden h-11 w-11 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-black hover:text-white md:flex md:opacity-0 md:group-hover/scroller:opacity-100"
      >
        <LuChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Scroll forward"
        onClick={() => scroll(1)}
        className="absolute right-1 top-[38%] hidden h-11 w-11 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-black hover:text-white md:flex md:opacity-0 md:group-hover/scroller:opacity-100"
      >
        <LuChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
