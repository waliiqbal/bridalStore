"use client";

import { useRouter } from "next/navigation";

export interface SortChoice {
  value: string;
  label: string;
  href: string;
}

export function SortSelect({ options, current }: { options: SortChoice[]; current: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted sm:inline">Sort by</span>
      <select
        // The visible "Sort by" is hidden on phones, so the dropdown names itself
        aria-label="Sort products"
        value={current}
        onChange={(event) => {
          const choice = options.find((option) => option.value === event.target.value);
          if (choice) router.push(choice.href, { scroll: false });
        }}
        className="cursor-pointer border border-line bg-white px-3 py-2 outline-none hover:border-gold focus:border-gold"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
