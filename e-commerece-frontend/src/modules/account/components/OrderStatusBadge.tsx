import { Badge } from "@/shared/admin/Layout";
import type { OrderStatus } from "../types/account";

const TONE = {
  PENDING_PAYMENT: "amber",
  PROCESSING: "gold",
  SHIPPED: "gold",
  DELIVERED: "green",
  CANCELLED: "neutral",
  REFUNDED: "red",
} as const satisfies Record<OrderStatus, "amber" | "gold" | "green" | "neutral" | "red">;

export function OrderStatusBadge({ status, label }: { status: OrderStatus; label: string }) {
  return <Badge tone={TONE[status]}>{label}</Badge>;
}
