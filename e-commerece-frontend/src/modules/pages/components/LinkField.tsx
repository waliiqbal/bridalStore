"use client";

import { Field, Input, Select } from "@/shared/admin/Form";
import type { LinkGroup } from "../lib/link-options";

// A link box with a "choose from your shop" list, so the owner rarely has to type an address.
export function LinkField({
  id,
  label,
  value,
  onChange,
  groups,
  error,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  groups: LinkGroup[];
  error?: string | null;
  hint?: string;
}) {
  const known = groups.some((group) => group.options.some((option) => option.value === value));

  return (
    <Field label={label} htmlFor={id} error={error} hint={hint}>
      <div className="space-y-2">
        <Select
          aria-label={`${label}: choose from your shop`}
          value={known ? value : ""}
          onChange={(event) => event.target.value && onChange(event.target.value)}
        >
          <option value="">
            {known || !value ? "Choose from your shop…" : "Custom address (typed below)"}
          </option>
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
        <Input
          id={id}
          value={value}
          maxLength={2000}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Or type an address, e.g. https://…"
        />
      </div>
    </Field>
  );
}
