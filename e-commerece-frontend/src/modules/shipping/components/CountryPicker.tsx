"use client";

import { useMemo } from "react";
import { LuX } from "react-icons/lu";
import { Select } from "@/shared/admin/Form";
import { countryName, countryOptions } from "@/shared/lib/countries";

// Pick countries: choose one from the list to add it, tap the × on a chip to take it away.
export function CountryPicker({
  value,
  onChange,
  id,
}: {
  value: string[];
  onChange: (codes: string[]) => void;
  id?: string;
}) {
  const all = useMemo(() => countryOptions(), []);
  const left = all.filter((c) => !value.includes(c.code));

  return (
    <div className="space-y-3">
      <Select
        id={id}
        value=""
        onChange={(event) => event.target.value && onChange([...value, event.target.value])}
        aria-label="Add a country"
      >
        <option value="">Add a country…</option>
        {left.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </Select>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((code) => (
            <li
              key={code}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream py-1 pl-3 pr-1.5 text-sm"
            >
              {countryName(code)}
              <button
                type="button"
                onClick={() => onChange(value.filter((c) => c !== code))}
                aria-label={`Remove ${countryName(code)}`}
                className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white"
              >
                <LuX className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
