"use client";

import { useEffect, useState } from "react";
import { LuRuler, LuX } from "react-icons/lu";

// A "Size guide" link that opens the owner's size chart in a window.
// `html` is the chart the owner built in the admin (cleaned by the backend before saving).
export function SizeGuideDialog({ name, html }: { name: string; html: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm underline hover:text-gold"
      >
        <LuRuler className="h-4 w-4" aria-hidden />
        Size guide
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close size guide"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-black/50"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={name}
            className="relative flex max-h-[90vh] w-full flex-col bg-white shadow-xl sm:max-w-2xl"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-serif text-xl font-bold">{name}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close size guide"
                className="p-1"
              >
                <LuX className="h-5 w-5" />
              </button>
            </div>
            <div className="richtext overflow-auto p-5" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      )}
    </>
  );
}
