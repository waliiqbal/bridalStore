import type { OrderStatus, PaymentProvider } from '../../generated/prisma/enums.js';

export const RESERVATION_MINUTES = 30;
export const ORDER_NUMBER_PREFIX = 'MBS-';

// Who is changing the status: the owner in admin, the system (scheduler,
// checkout), or a payment provider (phase 6 webhooks).
export type StatusActor = 'admin' | 'system' | 'payment';

const TRANSITIONS: Record<StatusActor, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  admin: {
    PENDING_PAYMENT: ['CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
  },
  system: {
    PENDING_PAYMENT: ['CANCELLED'],
  },
  payment: {
    PENDING_PAYMENT: ['PROCESSING'],
    // A late payment can revive an order whose hold expired (stock permitting)
    CANCELLED: ['PROCESSING'],
    PROCESSING: ['REFUNDED'],
    SHIPPED: ['REFUNDED'],
    DELIVERED: ['REFUNDED'],
  },
};

export function canTransition(from: OrderStatus, to: OrderStatus, actor: StatusActor): boolean {
  return TRANSITIONS[actor][from]?.includes(to) ?? false;
}

// Buttons the admin can press next, in the order they make sense.
export function nextStatusesForAdmin(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS.admin[from] ?? [];
}

// Plain-language labels for shoppers and the owner.
export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Waiting for payment',
  PROCESSING: 'Being prepared',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export function formatOrderNumber(sequenceValue: bigint | number): string {
  return `${ORDER_NUMBER_PREFIX}${sequenceValue.toString()}`;
}

// "mbs-10001 " → "MBS-10001"; null if it isn't an order number.
export function normalizeOrderNumber(input: string): string | null {
  const value = input.trim().toUpperCase();
  return /^MBS-\d{5,12}$/.test(value) ? value : null;
}

// AUD → Square (linked to the shop) and PayPal; other currencies → Stripe and PayPal.
export function paymentMethodsFor(currencyCode: string): PaymentProvider[] {
  return currencyCode === 'AUD' ? ['SQUARE', 'PAYPAL'] : ['STRIPE', 'PAYPAL'];
}

export function reservationExpiry(now = new Date()): Date {
  return new Date(now.getTime() + RESERVATION_MINUTES * 60_000);
}

// changedBy markers in OrderStatusChange
export const CHANGED_BY = {
  customer: 'customer',
  reservationExpired: 'system:reservation-expired',
  replacedByNewCheckout: 'system:replaced-by-new-checkout',
  payment: (provider: string) => `payment:${provider.toLowerCase()}`,
} as const;
