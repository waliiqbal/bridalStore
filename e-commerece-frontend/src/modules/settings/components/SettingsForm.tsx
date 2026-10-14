"use client";

import { useState } from "react";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input } from "@/shared/admin/Form";
import { Card } from "@/shared/admin/Layout";
import { updateSettings } from "../api/settings.api";
import {
  ANNOUNCEMENT_MAX,
  toFormState,
  toSettingsInput,
  validateSettings,
  type SettingsFormErrors,
  type SettingsFormState,
} from "../lib/settings-form";
import type { AdminSettings } from "../types/settings";

export function SettingsForm({ settings, onSaved }: { settings: AdminSettings; onSaved: () => void }) {
  const ui = useAdminUi();
  const [initial] = useState(() => toFormState(settings));
  const [form, setForm] = useState<SettingsFormState>(initial);
  const [errors, setErrors] = useState<SettingsFormErrors>({});
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = <K extends keyof SettingsFormState>(key: K, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function save() {
    const found = validateSettings(form);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      ui.error(new Error("Please fix the highlighted fields."));
      return;
    }
    setSaving(true);
    try {
      await updateSettings(toSettingsInput(form));
      ui.success("Settings saved.");
      onSaved();
    } catch (error) {
      ui.error(error);
    } finally {
      setSaving(false);
    }
  }

  // A plain text box for one setting
  const text = (
    key: keyof SettingsFormState,
    label: string,
    options: {
      hint?: string;
      placeholder?: string;
      maxLength?: number;
      type?: string;
      required?: boolean;
    } = {},
  ) => (
    <Field
      label={label}
      htmlFor={`s-${key}`}
      error={errors[key]}
      hint={options.hint}
      required={options.required}
    >
      <Input
        id={`s-${key}`}
        type={options.type ?? "text"}
        value={form[key]}
        maxLength={options.maxLength}
        placeholder={options.placeholder}
        onChange={(event) => set(key, event.target.value)}
      />
    </Field>
  );

  const message = form.announcementBar.trim();

  return (
    <div className="max-w-4xl space-y-6 pb-4">
      <Card title="Store details" description="Shown to customers in the footer and on your contact page.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {text("storeName", "Store name", { required: true, maxLength: 120 })}
          </div>
          {text("contactEmail", "Contact email", { type: "email", placeholder: "hello@yourstore.com" })}
          {text("contactPhone", "Contact phone", { maxLength: 40, placeholder: "+61 400 000 000" })}
        </div>
      </Card>

      <Card
        title="Message at the top of the shop"
        description="A short line in the bar above the menu, like a free-shipping offer. Leave empty to hide the bar."
      >
        <Field
          label="Announcement"
          htmlFor="s-announcementBar"
          error={errors.announcementBar}
          hint={`${form.announcementBar.length} / ${ANNOUNCEMENT_MAX} characters. Plain text only.`}
        >
          <Input
            id="s-announcementBar"
            value={form.announcementBar}
            onChange={(event) => set("announcementBar", event.target.value)}
            placeholder="Free shipping on orders over $200"
          />
        </Field>
        <div className="mt-4">
          <p className="mb-1.5 text-xs uppercase tracking-wide text-muted">How it will look</p>
          <div className="rounded-sm bg-black px-4 py-2 text-center text-sm text-white">
            {message || <span className="text-white/50">(no message: the bar is hidden)</span>}
          </div>
        </div>
      </Card>

      <Card
        title="Chat and social media"
        description="Customers will see a WhatsApp chat button and social icons in the footer. Leave a box empty to hide it."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {text("whatsappNumber", "WhatsApp number", {
              placeholder: "+61 400 000 000",
              hint: "Include the country code. Customers tap the button to chat with you.",
              maxLength: 20,
            })}
          </div>
          {text("instagramUrl", "Instagram link", { placeholder: "https://instagram.com/yourstudio" })}
          {text("facebookUrl", "Facebook link", { placeholder: "https://facebook.com/yourstudio" })}
          {text("tiktokUrl", "TikTok link", { placeholder: "https://tiktok.com/@yourstudio" })}
        </div>
      </Card>

      <Card
        title="GST"
        description="Your prices already include GST. This rate is used to work out the GST part shown on orders."
      >
        <div className="max-w-xs">
          <Field
            label="GST rate (%)"
            htmlFor="s-gstRatePercent"
            error={errors.gstRatePercent}
            hint="In Australia this is 10."
          >
            <div className="relative">
              <Input
                id="s-gstRatePercent"
                inputMode="decimal"
                value={form.gstRatePercent}
                onChange={(event) => set("gstRatePercent", event.target.value)}
                className="pr-10"
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted">
                %
              </span>
            </div>
          </Field>
        </div>
      </Card>

      <Card
        title="Visitor tracking (optional)"
        description="These let Facebook and Google show you how many people visit and buy. Leave empty if you aren't using them yet."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {text("metaPixelId", "Meta (Facebook) Pixel ID", {
            placeholder: "123456789012345",
            hint: "A number from your Meta Events Manager.",
            maxLength: 20,
          })}
          {text("googleAnalyticsId", "Google Analytics ID", {
            placeholder: "G-ABC1234567",
            hint: "Starts with G-. Found in Google Analytics under Admin, then Data streams.",
            maxLength: 22,
          })}
        </div>
      </Card>

      <div className="sticky bottom-0 z-30 -mx-4 flex items-center justify-end gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        {dirty && <span className="mr-auto text-sm text-amber-700">You have unsaved changes.</span>}
        <Button onClick={save} loading={saving} disabled={!dirty}>
          Save settings
        </Button>
      </div>
    </div>
  );
}
