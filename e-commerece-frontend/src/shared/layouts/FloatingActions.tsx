"use client";

import { LuArrowUp, LuBot, LuShoppingCart } from "react-icons/lu";

export function FloatingActions() {
  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2">
      <button
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="mb-2 flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white shadow"
      >
        <LuArrowUp className="h-5 w-5" />
      </button>
      <button className="flex items-center gap-2 rounded-md bg-black px-3 py-2 text-xs text-white">
        <LuBot className="h-5 w-5" /> AI Stylist
      </button>
      <button className="flex items-center gap-2 rounded-md bg-black px-3 py-2 text-xs text-white">
        <LuShoppingCart className="h-5 w-5" /> Live Shopping
      </button>
    </div>
  );
}
