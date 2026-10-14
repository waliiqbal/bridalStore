"use client";

import { useState } from "react";
import { centsToInputText, inputTextToCents, MONEY_INPUT_PATTERN } from "@/shared/lib/money";
import { inputClass } from "./Form";

// The owner types dollars ("1899.50"); the value we hand back is integer cents.
export function MoneyInput({
  id,
  value,
  onChange,
  placeholder = "0.00",
  disabled,
}: {
  id?: string;
  value: number | null;
  onChange: (cents: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  // While typing we show exactly what was typed; otherwise the tidy formatted value
  const [typing, setTyping] = useState<string | null>(null);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">$</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={typing ?? centsToInputText(value)}
        onFocus={() => setTyping(centsToInputText(value))}
        onBlur={() => setTyping(null)}
        onChange={(event) => {
          const text = event.target.value;
          if (!MONEY_INPUT_PATTERN.test(text)) return;
          setTyping(text);
          onChange(inputTextToCents(text));
        }}
        className={`${inputClass} pl-8 pr-16`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-muted">
        AUD
      </span>
    </div>
  );
}
