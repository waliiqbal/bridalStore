"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LuSlidersHorizontal, LuX } from "react-icons/lu";

// Holds the toolbar, the filter column and the products. On phones the filters slide in as a
// full-screen panel opened by the Filter button; on large screens they sit beside the products.
export function FilterShell({
  activeCount,
  resultsLabel,
  toolbarRight,
  sidebar,
  children,
}: {
  activeCount: number;
  resultsLabel: string;
  toolbarRight: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Keep the page behind the panel from scrolling
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-y border-line py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 border border-line px-3 py-2 text-sm hover:border-gold lg:hidden"
          >
            <LuSlidersHorizontal className="h-4 w-4" aria-hidden />
            Filter{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
          <p className="text-sm text-muted">{resultsLabel}</p>
        </div>
        {toolbarRight}
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <aside
          aria-label="Filters"
          className={
            open
              ? "fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white p-5 lg:static lg:block lg:p-0"
              : "hidden lg:block"
          }
        >
          <div className="mb-2 flex shrink-0 items-center justify-between lg:hidden">
            <h2 className="font-serif text-xl font-bold">Filters</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="p-2">
              <LuX className="h-5 w-5" />
            </button>
          </div>
          {sidebar}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="sticky bottom-0 mt-6 h-12 shrink-0 bg-black text-sm font-medium uppercase tracking-wider text-white lg:hidden"
          >
            Show {resultsLabel}
          </button>
        </aside>

        <div>{children}</div>
      </div>
    </div>
  );
}
