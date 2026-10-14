"use client";

import { useState } from "react";
import { LuX } from "react-icons/lu";

// Type a word and press Enter (or comma) to add it as a removable tag.
export function ChipInput({
  id,
  values,
  onChange,
  placeholder,
  suggestions = [],
  maxLength = 60,
}: {
  id?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  maxLength?: number;
}) {
  const [text, setText] = useState("");

  function add(raw: string) {
    const value = raw.trim().replace(/\s+/g, " ").slice(0, maxLength);
    setText("");
    if (!value) return;
    if (values.some((existing) => existing.toLowerCase() === value.toLowerCase())) return;
    onChange([...values, value]);
  }

  const remaining = suggestions.filter(
    (s) => !values.some((existing) => existing.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div>
      <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-sm border border-line bg-white px-3 py-2 focus-within:border-gold">
        {values.map((value) => (
          <span key={value} className="inline-flex items-center gap-1 rounded-full bg-cream px-3 py-1 text-sm">
            {value}
            <button
              type="button"
              aria-label={`Remove ${value}`}
              onClick={() => onChange(values.filter((v) => v !== value))}
              className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white"
            >
              <LuX className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          placeholder={values.length === 0 ? placeholder : undefined}
          onChange={(event) => {
            const next = event.target.value;
            if (next.endsWith(",")) add(next.slice(0, -1));
            else setText(next);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add(text);
            } else if (event.key === "Backspace" && text === "" && values.length > 0) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={() => add(text)}
          className="min-w-32 flex-1 bg-transparent py-1 text-base outline-none"
        />
      </div>
      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted">Quick add:</span>
          {remaining.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => add(suggestion)}
              className="rounded-full border border-line px-2.5 py-0.5 text-xs hover:border-gold hover:text-gold"
            >
              + {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
