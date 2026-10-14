"use client";

import { useState } from "react";

// Long text below the products. The whole text is on the page (good for Google), just folded.
// `html` comes from the owner's editor and is cleaned by the backend before it is saved.
export function ReadMore({ html }: { html: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div
        className={`richtext relative overflow-hidden ${open ? "" : "max-h-28"}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {!open && <div aria-hidden className="-mt-10 h-10 bg-gradient-to-t from-white to-transparent" />}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="mt-2 text-sm font-medium underline hover:text-gold"
      >
        {open ? "Read less" : "Read more"}
      </button>
    </div>
  );
}
