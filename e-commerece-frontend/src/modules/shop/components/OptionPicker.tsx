"use client";

import type { ReactNode } from "react";

export interface PickerOption {
  value: string;
  // A colour for a small dot, if we know one
  swatch?: string | null;
  disabled?: boolean;
}

// One row of choices (colours or sizes), shown as buttons. Only one can be chosen.
// A choice that is sold out is crossed out and can't be picked.
export function OptionPicker({
  label,
  chosen,
  options,
  value,
  onChange,
  action,
}: {
  label: string;
  // What is chosen right now, shown next to the label ("Colour: Ivory")
  chosen: string | null;
  options: PickerOption[];
  value: string | null;
  onChange: (value: string) => void;
  // Something to the right of the label, like a "Size guide" button
  action?: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {label}
          {chosen && <span className="ml-2 font-normal text-muted">{chosen}</span>}
        </p>
        {action}
      </div>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={option.disabled}
              title={option.disabled ? "Sold out" : undefined}
              onClick={() => onChange(option.value)}
              className={`flex min-h-11 min-w-12 items-center justify-center gap-2 border px-4 text-sm transition ${
                selected
                  ? "border-black bg-black text-white"
                  : option.disabled
                    ? "cursor-not-allowed border-line text-neutral-400 line-through"
                    : "border-neutral-300 hover:border-black"
              }`}
            >
              {option.swatch && (
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/20"
                  style={{ backgroundColor: option.swatch }}
                />
              )}
              {option.value}
            </button>
          );
        })}
      </div>
    </div>
  );
}
