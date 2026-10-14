import type { AdminBanner, BannerInput } from "../types/banners";

// The places a banner can appear. Plain names for the owner.
export const PLACEMENTS: { value: string; label: string; hint: string }[] = [
  {
    value: "home_hero",
    label: "Homepage: top banners",
    hint: "The big banners at the very top of the homepage.",
  },
  {
    value: "home_promo",
    label: "Homepage: promo banners",
    hint: "Smaller promotion banners further down the homepage.",
  },
];

export const placementLabel = (value: string) => PLACEMENTS.find((p) => p.value === value)?.label ?? value;

export type BannerStatus = { label: string; tone: "green" | "amber" | "neutral" };

// Same rule the server uses: switched on, started, and not yet ended
export function bannerStatus(banner: AdminBanner, now = new Date()): BannerStatus {
  if (!banner.isActive) return { label: "Switched off", tone: "neutral" };
  if (banner.startsAt && new Date(banner.startsAt) > now) return { label: "Scheduled", tone: "amber" };
  if (banner.endsAt && new Date(banner.endsAt) <= now) return { label: "Ended", tone: "neutral" };
  return { label: "Showing now", tone: "green" };
}

// <input type="datetime-local"> works in the visitor's own time zone, as "2026-12-01T09:30"
const pad = (n: number) => String(n).padStart(2, "0");
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (value: string): string | null => (value ? new Date(value).toISOString() : null);

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export interface BannerFormState {
  title: string;
  subtitle: string;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  linkUrl: string;
  buttonText: string;
  placement: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
}

export function toBannerForm(banner: AdminBanner | null): BannerFormState {
  return {
    title: banner?.title ?? "",
    subtitle: banner?.subtitle ?? "",
    imageUrl: banner?.imageUrl ?? null,
    mobileImageUrl: banner?.mobileImageUrl ?? null,
    linkUrl: banner?.linkUrl ?? "",
    buttonText: banner?.buttonText ?? "",
    placement: banner?.placement ?? PLACEMENTS[0].value,
    isActive: banner?.isActive ?? true,
    startsAt: toLocalInput(banner?.startsAt ?? null),
    endsAt: toLocalInput(banner?.endsAt ?? null),
  };
}

const SAFE_LINK = /^(\/(?!\/)\S*|https?:\/\/\S+|mailto:\S+|tel:[+0-9 ()-]+)$/i;

export type BannerErrors = Partial<Record<"image" | "link" | "dates", string>>;

export function validateBanner(form: BannerFormState): BannerErrors {
  const errors: BannerErrors = {};
  if (!form.imageUrl) errors.image = "Please add a picture.";
  if (form.linkUrl.trim() && !SAFE_LINK.test(form.linkUrl.trim())) {
    errors.link = "Use a link like /collections/eid-edit, or an address starting with https://";
  }
  if (form.buttonText.trim() && !form.linkUrl.trim()) errors.link = "Add a link for the button to open.";
  if (form.startsAt && form.endsAt && new Date(form.startsAt) >= new Date(form.endsAt)) {
    errors.dates = "The end must be after the start.";
  }
  return errors;
}

const orNull = (text: string) => (text.trim() ? text.trim() : null);

export function toBannerInput(form: BannerFormState): BannerInput {
  return {
    title: orNull(form.title),
    subtitle: orNull(form.subtitle),
    imageUrl: form.imageUrl ?? undefined,
    mobileImageUrl: form.mobileImageUrl,
    linkUrl: orNull(form.linkUrl),
    buttonText: orNull(form.buttonText),
    placement: form.placement,
    isActive: form.isActive,
    startsAt: fromLocalInput(form.startsAt),
    endsAt: fromLocalInput(form.endsAt),
  };
}
