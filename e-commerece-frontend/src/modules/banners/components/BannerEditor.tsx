"use client";

import { useState } from "react";
import { LinkField } from "@/modules/pages/components/LinkField";
import type { LinkGroup } from "@/modules/pages/lib/link-options";
import { SingleImageField } from "@/modules/uploads/components/SingleImageField";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input, Select, Toggle } from "@/shared/admin/Form";
import { Modal } from "@/shared/admin/Modal";
import { createBanner, updateBanner } from "../api/banners.api";
import {
  PLACEMENTS,
  placementLabel,
  toBannerForm,
  toBannerInput,
  validateBanner,
  type BannerErrors,
  type BannerFormState,
} from "../lib/banner-form";
import type { AdminBanner } from "../types/banners";

export function BannerEditor({
  banner,
  linkGroups,
  onClose,
  onSaved,
}: {
  // null = adding a new banner
  banner: AdminBanner | null;
  linkGroups: LinkGroup[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const ui = useAdminUi();
  const editing = banner !== null;
  const [form, setForm] = useState<BannerFormState>(() => toBannerForm(banner));
  const [errors, setErrors] = useState<BannerErrors>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof BannerFormState>(key: K, value: BannerFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors({});
  };

  // A banner saved with a place we don't list still shows its place
  const placements = PLACEMENTS.some((p) => p.value === form.placement)
    ? PLACEMENTS
    : [...PLACEMENTS, { value: form.placement, label: placementLabel(form.placement), hint: "" }];

  async function save() {
    const found = validateBanner(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      ui.error(new Error(Object.values(found)[0]));
      return;
    }
    setSaving(true);
    try {
      if (banner) await updateBanner(banner.id, toBannerInput(form));
      else await createBanner(toBannerInput(form));
      ui.success(editing ? "Banner saved." : "Banner added.");
      onSaved();
    } catch (error) {
      ui.error(error);
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={editing ? "Edit banner" : "Add banner"}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {editing ? "Save banner" : "Add banner"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Picture" required error={errors.image} hint="A wide picture works best.">
          <SingleImageField value={form.imageUrl} onChange={(url) => set("imageUrl", url)} alt={form.title} />
        </Field>
        <Field
          label="Phone picture (optional)"
          hint="A taller picture for phones. If empty, the main picture is used."
        >
          <SingleImageField
            value={form.mobileImageUrl}
            onChange={(url) => set("mobileImageUrl", url)}
            alt={form.title}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Headline (optional)" htmlFor="bn-title">
            <Input
              id="bn-title"
              value={form.title}
              maxLength={150}
              placeholder="e.g. Eid Sale"
              onChange={(event) => set("title", event.target.value)}
            />
          </Field>
          <Field label="Smaller line (optional)" htmlFor="bn-subtitle">
            <Input
              id="bn-subtitle"
              value={form.subtitle}
              maxLength={300}
              placeholder="e.g. Up to 20% off selected outfits"
              onChange={(event) => set("subtitle", event.target.value)}
            />
          </Field>
          <Field label="Button text (optional)" htmlFor="bn-button">
            <Input
              id="bn-button"
              value={form.buttonText}
              maxLength={60}
              placeholder="e.g. Shop now"
              onChange={(event) => set("buttonText", event.target.value)}
            />
          </Field>
          <LinkField
            id="bn-link"
            label="Where the banner goes"
            value={form.linkUrl}
            onChange={(value) => set("linkUrl", value)}
            groups={linkGroups}
            error={errors.link}
          />
        </div>

        <Field
          label="Where it appears"
          htmlFor="bn-placement"
          hint={placements.find((p) => p.value === form.placement)?.hint}
        >
          <Select
            id="bn-placement"
            value={form.placement}
            onChange={(event) => set("placement", event.target.value)}
          >
            {placements.map((placement) => (
              <option key={placement.value} value={placement.value}>
                {placement.label}
              </option>
            ))}
          </Select>
        </Field>

        <fieldset className="rounded-sm border border-line p-4">
          <legend className="px-1 text-sm font-medium">When should it show?</legend>
          <p className="mb-3 text-xs text-muted">
            Leave both empty to show it all the time. Set dates for a sale: it appears and disappears by
            itself. Times use your computer&apos;s clock.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts" htmlFor="bn-starts">
              <Input
                id="bn-starts"
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => set("startsAt", event.target.value)}
              />
            </Field>
            <Field label="Ends" htmlFor="bn-ends" error={errors.dates}>
              <Input
                id="bn-ends"
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => set("endsAt", event.target.value)}
              />
            </Field>
          </div>
        </fieldset>

        <Toggle
          checked={form.isActive}
          onChange={(value) => set("isActive", value)}
          label="Switched on"
          hint="Turn off to hide it without deleting it."
        />
      </div>
    </Modal>
  );
}
