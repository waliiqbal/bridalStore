"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input, Toggle } from "@/shared/admin/Form";
import { Modal } from "@/shared/admin/Modal";
import { createZone, updateZone } from "../api/shipping.admin.api";
import type { ShippingZone } from "../types/shipping";
import { CountryPicker } from "./CountryPicker";

// Add or change a shipping zone: a group of countries that share the same shipping prices.
export function ZoneModal({
  zone,
  hasFallback,
  onClose,
  onSaved,
}: {
  zone: ShippingZone | null;
  // Another zone is already "the rest of the world"
  hasFallback: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ui = useAdminUi();
  const [name, setName] = useState(zone?.name ?? "");
  const [countries, setCountries] = useState<string[]>(zone?.countryCodes ?? []);
  const [fallback, setFallback] = useState(zone?.isFallback ?? false);
  const [gst, setGst] = useState(zone?.chargesGst ?? false);
  const [errors, setErrors] = useState<{ name?: string; countries?: string }>({});
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const found = {
      name: name.trim() ? undefined : "Please give this zone a name, like “Australia”.",
      countries: fallback || countries.length > 0 ? undefined : "Add at least one country.",
    };
    setErrors(found);
    if (found.name || found.countries) return;

    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        countryCodes: fallback ? [] : countries,
        isFallback: fallback,
        chargesGst: gst,
      };
      if (zone) await updateZone(zone.id, input);
      else await createZone(input);
      ui.success(zone ? "Zone saved." : "Zone added. Now add a shipping option to it.");
      onSaved();
    } catch (error) {
      ui.error(error);
      setSaving(false);
    }
  }

  return (
    <Modal open title={zone ? "Change zone" : "Add a zone"} size="lg" onClose={onClose}>
      <form onSubmit={save} noValidate className="space-y-5">
        <Field
          label="Zone name"
          htmlFor="zone-name"
          required
          error={errors.name}
          hint="For example “Australia”, “USA and Canada” or “Rest of the world”."
        >
          <Input
            id="zone-name"
            value={name}
            maxLength={80}
            autoFocus
            onChange={(event) => {
              setName(event.target.value);
              setErrors((current) => ({ ...current, name: undefined }));
            }}
            aria-invalid={!!errors.name}
          />
        </Field>

        <Toggle
          checked={fallback}
          onChange={setFallback}
          disabled={hasFallback && !zone?.isFallback}
          label="This zone is for every other country"
          hint={
            hasFallback && !zone?.isFallback
              ? "Another zone already covers all other countries."
              : "Countries that are not listed in any other zone use this one."
          }
        />

        {!fallback && (
          <Field
            label="Countries"
            htmlFor="zone-countries"
            required
            error={errors.countries}
            hint="A country can be in only one zone."
          >
            <CountryPicker
              id="zone-countries"
              value={countries}
              onChange={(codes) => {
                setCountries(codes);
                setErrors((current) => ({ ...current, countries: undefined }));
              }}
            />
          </Field>
        )}

        <Toggle
          checked={gst}
          onChange={setGst}
          label="Australian GST applies to this zone"
          hint="Turn this on for Australia. Orders sent overseas are usually GST-free (see Settings)."
        />

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {zone ? "Save zone" : "Add zone"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
