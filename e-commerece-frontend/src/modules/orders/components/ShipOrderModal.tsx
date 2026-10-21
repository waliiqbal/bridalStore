"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input } from "@/shared/admin/Form";
import { Modal } from "@/shared/admin/Modal";
import { shipOrder } from "../api/orders.admin.api";
import type { AdminOrder } from "../types/orders";

// "Mark as shipped": the tracking number goes in the email the customer receives.
export function ShipOrderModal({
  order,
  onClose,
  onDone,
}: {
  order: AdminOrder;
  onClose: () => void;
  onDone: () => void;
}) {
  const ui = useAdminUi();
  const [number, setNumber] = useState("");
  const [link, setLink] = useState("");
  const [errors, setErrors] = useState<{ number?: string; link?: string }>({});
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const found = {
      number: number.trim() ? undefined : "Please enter the tracking number from the courier.",
      link:
        !link.trim() || /^https:\/\/\S+$/i.test(link.trim())
          ? undefined
          : "The link must start with https://",
    };
    setErrors(found);
    if (found.number || found.link) return;

    setSaving(true);
    try {
      await shipOrder(order.id, { trackingNumber: number.trim(), trackingUrl: link.trim() || null });
      ui.success(`Order ${order.orderNumber} is marked as shipped.`);
      onDone();
    } catch (error) {
      ui.error(error);
      setSaving(false);
    }
  }

  return (
    <Modal open title={`Ship order ${order.orderNumber}`} size="md" onClose={onClose}>
      <form onSubmit={save} noValidate className="space-y-5">
        <Field
          label="Tracking number"
          htmlFor="ship-number"
          required
          error={errors.number}
          hint="From the courier or Australia Post. The customer sees it on their order."
        >
          <Input
            id="ship-number"
            value={number}
            maxLength={100}
            autoFocus
            onChange={(event) => {
              setNumber(event.target.value);
              setErrors((current) => ({ ...current, number: undefined }));
            }}
            aria-invalid={!!errors.number}
          />
        </Field>
        <Field
          label="Tracking link"
          htmlFor="ship-link"
          error={errors.link}
          hint="Optional. The web address where the customer can follow the parcel."
        >
          <Input
            id="ship-link"
            value={link}
            maxLength={2000}
            placeholder="https://"
            onChange={(event) => {
              setLink(event.target.value);
              setErrors((current) => ({ ...current, link: undefined }));
            }}
            aria-invalid={!!errors.link}
          />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Mark as shipped
          </Button>
        </div>
      </form>
    </Modal>
  );
}
