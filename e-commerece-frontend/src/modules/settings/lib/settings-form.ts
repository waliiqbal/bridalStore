import { EMAIL_PATTERN } from "@/shared/lib/validators";
import type { AdminSettings, SettingsInput } from "../types/settings";

export interface SettingsFormState {
  storeName: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  announcementBar: string;
  gstRatePercent: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  metaPixelId: string;
  googleAnalyticsId: string;
  emailFooterNote: string;
}

// The on/off settings (the boxes above all hold text)
export const FLAG_KEYS = [
  "removeGstForExports",
  "sendOrderEmails",
  "sendShippingEmails",
  "autoApproveReviews",
] as const;
export type SettingsFlags = Record<(typeof FLAG_KEYS)[number], boolean>;

export const toFlags = (settings: AdminSettings): SettingsFlags => ({
  removeGstForExports: settings.removeGstForExports,
  sendOrderEmails: settings.sendOrderEmails,
  sendShippingEmails: settings.sendShippingEmails,
  autoApproveReviews: settings.autoApproveReviews,
});

export type SettingsFormErrors = Partial<Record<keyof SettingsFormState, string>>;

export const ANNOUNCEMENT_MAX = 300;
export const EMAIL_NOTE_MAX = 300;

export function toFormState(settings: AdminSettings): SettingsFormState {
  return {
    storeName: settings.storeName,
    contactEmail: settings.contactEmail ?? "",
    contactPhone: settings.contactPhone ?? "",
    whatsappNumber: settings.whatsappNumber ?? "",
    announcementBar: settings.announcementBar ?? "",
    gstRatePercent: String(settings.gstRatePercent),
    instagramUrl: settings.instagramUrl ?? "",
    facebookUrl: settings.facebookUrl ?? "",
    tiktokUrl: settings.tiktokUrl ?? "",
    metaPixelId: settings.metaPixelId ?? "",
    googleAnalyticsId: settings.googleAnalyticsId ?? "",
    emailFooterNote: settings.emailFooterNote ?? "",
  };
}

const WHATSAPP = /^\+?[0-9 ]{6,20}$/;
const HTTPS_URL = /^https:\/\/\S+$/i;
const PIXEL = /^\d{5,20}$/;
const GA_ID = /^G-[A-Z0-9]{4,20}$/;
const GST = /^\d{1,3}(\.\d{1,2})?$/;

export function validateSettings(form: SettingsFormState): SettingsFormErrors {
  const errors: SettingsFormErrors = {};
  const filled = (value: string) => value.trim() !== "";

  if (!filled(form.storeName)) errors.storeName = "Please enter your store name.";
  if (filled(form.contactEmail) && !EMAIL_PATTERN.test(form.contactEmail.trim())) {
    errors.contactEmail = "Please enter a valid email address.";
  }
  if (filled(form.whatsappNumber) && !WHATSAPP.test(form.whatsappNumber.trim())) {
    errors.whatsappNumber = "Use digits with the country code, like +61 400 000 000.";
  }
  if (form.announcementBar.length > ANNOUNCEMENT_MAX) {
    errors.announcementBar = `Please keep this under ${ANNOUNCEMENT_MAX} characters.`;
  }
  if (form.emailFooterNote.length > EMAIL_NOTE_MAX) {
    errors.emailFooterNote = `Please keep this under ${EMAIL_NOTE_MAX} characters.`;
  }
  const rate = Number(form.gstRatePercent);
  if (!GST.test(form.gstRatePercent.trim()) || rate < 0 || rate > 100) {
    errors.gstRatePercent = "Enter a percentage between 0 and 100, like 10.";
  }
  for (const key of ["instagramUrl", "facebookUrl", "tiktokUrl"] as const) {
    if (filled(form[key]) && !HTTPS_URL.test(form[key].trim())) {
      errors[key] = "The link must start with https://";
    }
  }
  if (filled(form.metaPixelId) && !PIXEL.test(form.metaPixelId.trim())) {
    errors.metaPixelId = "The Pixel ID is a number, like 123456789012345.";
  }
  if (filled(form.googleAnalyticsId) && !GA_ID.test(form.googleAnalyticsId.trim().toUpperCase())) {
    errors.googleAnalyticsId = "The ID looks like G-ABC1234567.";
  }
  return errors;
}

const orNull = (text: string) => (text.trim() ? text.trim() : null);

export function toSettingsInput(form: SettingsFormState): SettingsInput {
  return {
    storeName: form.storeName.trim(),
    contactEmail: orNull(form.contactEmail),
    contactPhone: orNull(form.contactPhone),
    whatsappNumber: orNull(form.whatsappNumber),
    announcementBar: orNull(form.announcementBar),
    gstRatePercent: Number(form.gstRatePercent.trim()),
    instagramUrl: orNull(form.instagramUrl),
    facebookUrl: orNull(form.facebookUrl),
    tiktokUrl: orNull(form.tiktokUrl),
    metaPixelId: orNull(form.metaPixelId),
    googleAnalyticsId: orNull(form.googleAnalyticsId)?.toUpperCase() ?? null,
    emailFooterNote: orNull(form.emailFooterNote),
  };
}
