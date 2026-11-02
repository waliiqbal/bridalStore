"use client";

import { PAYMENT_ICON_OPTIONS } from "@/config/footer-defaults";
import { Input } from "@/shared/admin/Form";
import { Card } from "@/shared/admin/Layout";
import type { FooterFormErrors, FooterFormState } from "../lib/settings-form";

// The parts of the footer that are not link columns: the promises above it and the payment logos.
export function FooterSettingsCard({
  footer,
  errors,
  onChange,
}: {
  footer: FooterFormState;
  errors: FooterFormErrors;
  onChange: (next: FooterFormState) => void;
}) {
  const set = <K extends keyof FooterFormState>(key: K, value: FooterFormState[K]) =>
    onChange({ ...footer, [key]: value });

  const setPromise = (index: number, key: "title" | "text", value: string) =>
    set(
      "promises",
      footer.promises.map((promise, i) => (i === index ? { ...promise, [key]: value } : promise)),
    );

  const toggleIcon = (value: string, on: boolean) =>
    set("paymentIcons", on ? [...footer.paymentIcons, value] : footer.paymentIcons.filter((icon) => icon !== value));

  return (
    <Card
      title="Footer (the bottom of every page)"
      description="The columns of the footer (links, words, buttons, your logo, social icons) are built under Menus → Footer menu. Here you set the three promises above it and the payment logos below it."
    >
      <div className="space-y-6">
        <fieldset className="rounded-sm border border-line p-4">
          <legend className="px-1 text-sm font-medium">Three promises above the footer</legend>
          <p className="mb-4 text-xs text-muted">
            A short title and a line under it, like “Shipped worldwide”. Clear both boxes of a line to leave it
            out. Clear all three to hide the whole strip.
          </p>
          <div className="space-y-4">
            {footer.promises.map((promise, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-[1fr_2fr]">
                <Input
                  aria-label={`Promise ${index + 1} title`}
                  value={promise.title}
                  maxLength={60}
                  placeholder="Title"
                  onChange={(event) => setPromise(index, "title", event.target.value)}
                />
                <Input
                  aria-label={`Promise ${index + 1} line`}
                  value={promise.text}
                  maxLength={140}
                  placeholder="A short line under the title"
                  onChange={(event) => setPromise(index, "text", event.target.value)}
                />
              </div>
            ))}
          </div>
          {errors.promises && <p className="mt-3 text-sm text-red-600">{errors.promises}</p>}
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Payment logos to show</legend>
          <p className="mb-3 text-xs text-muted">Tick only the ones you really accept.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {PAYMENT_ICON_OPTIONS.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-black"
                  checked={footer.paymentIcons.includes(option.value)}
                  onChange={(event) => toggleIcon(option.value, event.target.checked)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </Card>
  );
}
