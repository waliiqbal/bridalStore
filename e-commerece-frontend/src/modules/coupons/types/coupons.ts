import type { Money } from "@/shared/lib/money";

// Matches the backend's admin coupon responses exactly (GET/POST /api/admin/coupons...).
// Money amounts are in Australian dollars (AUD cents).

export type CouponType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";

// The coupon's situation in plain terms, worked out by the server
export type CouponState = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "USED_UP" | "INACTIVE";

export interface AdminCoupon {
  id: string;
  // What shoppers type, always capitals
  code: string;
  type: CouponType;
  // PERCENTAGE: 1 to 100. FIXED_AMOUNT: AUD cents. FREE_SHIPPING: not used.
  value: number;
  // The smallest order (AUD cents) the code works for
  minOrderAmount: number | null;
  // How many times in total it can be used
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  state: CouponState;
  // Set for FIXED_AMOUNT
  amount: Money | null;
  minOrder: Money | null;
}

export interface CouponInput {
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

export interface CouponListQuery {
  q?: string;
  page?: number;
  pageSize?: number;
}
