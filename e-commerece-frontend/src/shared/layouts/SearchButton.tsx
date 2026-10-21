"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LuSearch, LuX } from "react-icons/lu";

// The magnifying glass in the header. Opens a search bar under the header.
export function SearchButton() {
  const router = useRouter();
  const pathname = usePathname();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  // Close when the visitor goes to another page
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const q = term.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close search" : "Search"}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center hover:text-gold"
      >
        {open ? <LuX className="h-5 w-5" /> : <LuSearch className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 border-b border-line bg-white shadow-sm">
          <form onSubmit={submit} role="search" className="mx-auto flex max-w-2xl gap-2 px-4 py-4">
            <input
              ref={input}
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search for a lehenga, sharara, sherwani…"
              aria-label="Search the shop"
              maxLength={100}
              className="h-12 min-w-0 flex-1 rounded-sm border border-line px-4 text-base outline-none focus:border-gold"
            />
            <button
              type="submit"
              className="h-12 shrink-0 rounded-sm bg-black px-5 text-sm font-medium uppercase tracking-wider text-white transition hover:bg-gold"
            >
              Search
            </button>
          </form>
        </div>
      )}
    </>
  );
}
