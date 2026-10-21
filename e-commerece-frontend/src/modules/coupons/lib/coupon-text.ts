import { formatDate } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import type { AdminCoupon, CouponState } from "../types/coupons";

// What a code does, in plain words: "10% off", "$20 off", "Free shipping"
export function describeDiscount(coupon: AdminCoupon): string {
  if (coupon.type === "PERCENTAGE") return `${coupon.value}% off`;
  if (coupon.type === "FIXED_AMOUNT" && coupon.amount) return `${formatMoney(coupon.amount)} off`;
  return "Free shipping";
}

export const STATE_WORDS: Record<CouponState, string> = {
  ACTIVE: "Active",
  SCHEDULED: "Starts later",
  EXPIRED: "Expired",
  USED_UP: "Used up",
  INACTIVE: "Switched off",
};

export const STATE_TONE = {
  ACTIVE: "green",
  SCHEDULED: "amber",
  EXPIRED: "neutral",
  USED_UP: "neutral",
  INACTIVE: "neutral",
} as const satisfies Record<CouponState, "green" | "amber" | "neutral">;

// The small print under a code: minimum order, how often it was used, and when it runs
export function couponDetails(coupon: AdminCoupon): string {
  const parts: string[] = [];
  if (coupon.minOrder) parts.push(`Orders over ${formatMoney(coupon.minOrder)}`);
  parts.push(
    coupon.maxUses === null
      ? `Used ${coupon.usedCount} ${coupon.usedCount === 1 ? "time" : "times"}`
      : `Used ${coupon.usedCount} of ${coupon.maxUses}`,
  );
  if (coupon.startsAt) parts.push(`from ${formatDate(coupon.startsAt)}`);
  if (coupon.expiresAt) parts.push(`until ${formatDate(coupon.expiresAt)}`);
  return parts.join(" · ");
}

// Dates in the form: the box holds a plain day ("2026-12-31"), the server wants an exact moment.
// A code starts at the beginning of its first day and stops at the end of its last day (the
// owner's own time zone).
export const dayToInput = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA") : "");
export const startOfDay = (day: string) => (day ? new Date(`${day}T00:00:00`).toISOString() : null);
export const endOfDay = (day: string) => (day ? new Date(`${day}T23:59:59`).toISOString() : null);
