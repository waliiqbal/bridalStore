"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input, Toggle } from "@/shared/admin/Form";
import { MoneyInput } from "@/shared/admin/MoneyInput";
import { Modal } from "@/shared/admin/Modal";
import { createRate, updateRate } from "../api/shipping.admin.api";
import type { ShippingRate, ShippingZone } from "../types/shipping";

// Add or change one shipping option of a zone ("Standard, $15, free over $300").
export function RateModal({
  zone,
  rate,
  onClose,
  onSaved,
}: {
  zone: ShippingZone;
  rate: ShippingRate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ui = useAdminUi();
  const [name, setName] = useState(rate?.name ?? "");
  const [price, setPrice] = useState<number | null>(rate?.price ?? null);
  const [freeOver, setFreeOver] = useState<number | null>(rate?.freeOverAmount ?? null);
  const [days, setDays] = useState(rate?.estimatedDays ?? "");
  const [active, setActive] = useState(rate?.isActive ?? true);
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const found = {
      name: name.trim() ? undefined : "Please name this option, like “Standard”.",
      price: price === null ? "Please enter the price. Enter 0 for free shipping." : undefined,
    };
    setErrors(found);
    if (found.name || found.price) return;

    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        price: price ?? 0,
        freeOverAmount: freeOver && freeOver > 0 ? freeOver : null,
        estimatedDays: days.trim() || null,
        isActive: active,
      };
      if (rate) await updateRate(zone.id, rate.id, input);
      else await createRate(zone.id, input);
      ui.success(rate ? "Shipping option saved." : "Shipping option added.");
      onSaved();
    } catch (error) {
      ui.error(error);
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={`${rate ? "Change" : "Add"} shipping option · ${zone.name}`}
      size="md"
      onClose={onClose}
    >
      <form onSubmit={save} noValidate className="space-y-5">
        <Field
          label="Name"
          htmlFor="rate-name"
          required
          error={errors.name}
          hint="What the customer sees, like “Standard” or “Express”."
        >
          <Input
            id="rate-name"
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
        <Field
          label="Price (AUD)"
          htmlFor="rate-price"
          required
          error={errors.price}
          hint="In Australian dollars. Customers in other currencies see it converted."
        >
          <MoneyInput
            id="rate-price"
            value={price}
            onChange={(cents) => {
              setPrice(cents);
              setErrors((current) => ({ ...current, price: undefined }));
            }}
          />
        </Field>
        <Field
          label="Free when the order is over (AUD)"
          htmlFor="rate-free"
          hint="Optional. For example 300 makes shipping free for orders over $300. Leave empty for never free."
        >
          <MoneyInput id="rate-free" value={freeOver} onChange={setFreeOver} />
        </Field>
        <Field
          label="How long it takes"
          htmlFor="rate-days"
          hint="Optional. For example “3–7 business days”."
        >
          <Input
            id="rate-days"
            value={days}
            maxLength={60}
            onChange={(event) => setDays(event.target.value)}
          />
        </Field>
        <Toggle
          checked={active}
          onChange={setActive}
          label="Offer this option to customers"
          hint="Switch off to hide it without deleting it."
        />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {rate ? "Save option" : "Add option"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
