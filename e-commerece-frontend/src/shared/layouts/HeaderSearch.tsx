"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LuSearch } from "react-icons/lu";

// The search bar in the header on wide screens. Smaller screens use SearchButton.
export function HeaderSearch() {
  const router = useRouter();
  const [term, setTerm] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const q = term.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={submit} role="search" className="flex h-11 w-full max-w-xl overflow-hidden rounded-md">
      <input
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search for lehengas…"
        aria-label="Search the shop"
        maxLength={100}
        className="min-w-0 flex-1 bg-[#f2f2f2] px-4 text-sm outline-none placeholder:text-neutral-500 focus:bg-[#ececec]"
      />
      <button
        type="submit"
        aria-label="Search"
        className="flex w-12 shrink-0 items-center justify-center bg-black text-white transition hover:bg-gold"
      >
        <LuSearch className="h-5 w-5" />
      </button>
    </form>
  );
}
