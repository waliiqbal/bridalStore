"use client";

import { useMemo } from "react";
import { Field, Input, Select } from "@/shared/admin/Form";
import { countryOptions } from "@/shared/lib/countries";
import type { AddressInput } from "../types/account";

// The boxes of an address, shared by the account page (saving addresses) and the checkout
// (where to send the order), so both ask for exactly the same things in the same way.

export const EMPTY_ADDRESS: AddressInput = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postcode: "",
  countryCode: "AU",
  isDefault: false,
};

export type AddressErrors = Partial<Record<"fullName" | "line1" | "city" | "postcode", string>>;

// Which required boxes are empty, in plain words (empty object = fine)
export function validateAddress(a: AddressInput): AddressErrors {
  const found: AddressErrors = {};
  if (!a.fullName.trim()) found.fullName = "Please enter the full name.";
  if (!a.line1.trim()) found.line1 = "Please enter the street address.";
  if (!a.city.trim()) found.city = "Please enter the city or suburb.";
  if (!a.postcode.trim()) found.postcode = "Please enter the postcode.";
  return found;
}

// What is sent to the server: spaces trimmed and empty optional boxes sent as "nothing"
export function cleanAddress(a: AddressInput): Omit<AddressInput, "isDefault"> {
  return {
    fullName: a.fullName.trim(),
    phone: a.phone?.trim() || null,
    line1: a.line1.trim(),
    line2: a.line2?.trim() || null,
    city: a.city.trim(),
    state: a.state?.trim() || null,
    postcode: a.postcode.trim(),
    countryCode: a.countryCode,
  };
}

export function AddressFields({
  value,
  onChange,
  errors = {},
  idPrefix = "addr",
}: {
  value: AddressInput;
  onChange: <K extends keyof AddressInput>(key: K, next: AddressInput[K]) => void;
  errors?: AddressErrors;
  // Keeps the box ids unique if two address forms are ever on one page
  idPrefix?: string;
}) {
  const countries = useMemo(() => countryOptions(), []);
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor={id("name")} required error={errors.fullName}>
          <Input
            id={id("name")}
            autoComplete="name"
            maxLength={120}
            value={value.fullName}
            onChange={(event) => onChange("fullName", event.target.value)}
            aria-invalid={!!errors.fullName}
          />
        </Field>
        <Field label="Phone" htmlFor={id("phone")} hint="Optional. Helps the courier reach you.">
          <Input
            id={id("phone")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={24}
            value={value.phone ?? ""}
            onChange={(event) => onChange("phone", event.target.value)}
          />
        </Field>
      </div>
      <Field label="Street address" htmlFor={id("line1")} required error={errors.line1}>
        <Input
          id={id("line1")}
          autoComplete="address-line1"
          maxLength={200}
          value={value.line1}
          onChange={(event) => onChange("line1", event.target.value)}
          aria-invalid={!!errors.line1}
        />
      </Field>
      <Field label="Apartment, unit, building" htmlFor={id("line2")} hint="Optional">
        <Input
          id={id("line2")}
          autoComplete="address-line2"
          maxLength={200}
          value={value.line2 ?? ""}
          onChange={(event) => onChange("line2", event.target.value)}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="City or suburb" htmlFor={id("city")} required error={errors.city}>
          <Input
            id={id("city")}
            autoComplete="address-level2"
            maxLength={100}
            value={value.city}
            onChange={(event) => onChange("city", event.target.value)}
            aria-invalid={!!errors.city}
          />
        </Field>
        <Field label="State or region" htmlFor={id("state")}>
          <Input
            id={id("state")}
            autoComplete="address-level1"
            maxLength={100}
            value={value.state ?? ""}
            onChange={(event) => onChange("state", event.target.value)}
          />
        </Field>
        <Field label="Postcode" htmlFor={id("postcode")} required error={errors.postcode}>
          <Input
            id={id("postcode")}
            autoComplete="postal-code"
            maxLength={20}
            value={value.postcode}
            onChange={(event) => onChange("postcode", event.target.value)}
            aria-invalid={!!errors.postcode}
          />
        </Field>
        <Field label="Country" htmlFor={id("country")} required>
          <Select
            id={id("country")}
            autoComplete="country"
            value={value.countryCode}
            onChange={(event) => onChange("countryCode", event.target.value)}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </>
  );
}
