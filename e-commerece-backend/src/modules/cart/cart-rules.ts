// Pure cart rules, shared by the cart service and (later) checkout.

export const MAX_QUANTITY_PER_LINE = 10;
export const CART_TTL_DAYS = 30;

export type CartLineStatus = 'OK' | 'LIMITED' | 'OUT_OF_STOCK' | 'UNAVAILABLE';

export interface LineState {
  status: CartLineStatus;
  // How many the shopper can buy right now (0 when not purchasable)
  availableQuantity: number;
}

/**
 * - UNAVAILABLE: product not ACTIVE, or variant deactivated
 * - OUT_OF_STOCK: no stock
 * - LIMITED: fewer in stock than the quantity in the cart
 * - OK: can be bought as is
 */
export function lineStatus(input: {
  productStatus: string;
  variantActive: boolean;
  stock: number;
  quantity: number;
}): LineState {
  if (input.productStatus !== 'ACTIVE' || !input.variantActive) {
    return { status: 'UNAVAILABLE', availableQuantity: 0 };
  }
  if (input.stock <= 0) return { status: 'OUT_OF_STOCK', availableQuantity: 0 };
  const availableQuantity = Math.min(input.stock, MAX_QUANTITY_PER_LINE);
  if (input.quantity > input.stock) return { status: 'LIMITED', availableQuantity };
  return { status: 'OK', availableQuantity };
}

export const LINE_MESSAGES: Record<CartLineStatus, (available: number) => string | null> = {
  OK: () => null,
  LIMITED: (n) => `Only ${n} left. Please reduce the quantity to continue.`,
  OUT_OF_STOCK: () => 'Sold out. Please remove it to continue.',
  UNAVAILABLE: () => 'This item is no longer available. Please remove it to continue.',
};

/**
 * Quantity to store: at least 1, at most MAX_QUANTITY_PER_LINE and, when
 * there is stock, at most the stock. With no stock the quantity is kept
 * (capped at the max) so the line can show OUT_OF_STOCK instead of vanishing.
 */
export function capQuantity(desired: number, stock: number): number {
  const limit = stock > 0 ? Math.min(MAX_QUANTITY_PER_LINE, stock) : MAX_QUANTITY_PER_LINE;
  return Math.max(1, Math.min(Math.floor(desired), limit));
}

// Message when an add/update was reduced, or null.
export function capNotice(desired: number, stored: number, stock: number): string | null {
  if (stored >= desired) return null;
  if (stored === MAX_QUANTITY_PER_LINE && stock > MAX_QUANTITY_PER_LINE) {
    return `You can add up to ${MAX_QUANTITY_PER_LINE} of each item.`;
  }
  return `Only ${stock} available. We've added the maximum to your bag.`;
}

export interface CartLineQuantity {
  variantId: string;
  quantity: number;
}

/**
 * Merge a guest cart into the customer's cart. Returns the lines to write
 * into the customer's cart (unchanged customer lines are omitted).
 * Shared variants: quantities are summed, then capped by stock and the max.
 * Sold-out variants keep the larger quantity (shown as OUT_OF_STOCK) — no
 * line is ever dropped.
 */
export function planCartMerge(
  customerLines: CartLineQuantity[],
  guestLines: CartLineQuantity[],
  stockByVariant: Map<string, number>,
): CartLineQuantity[] {
  const existing = new Map(customerLines.map((l) => [l.variantId, l.quantity]));
  const writes: CartLineQuantity[] = [];

  for (const guest of guestLines) {
    const stock = stockByVariant.get(guest.variantId) ?? 0;
    const current = existing.get(guest.variantId);
    const quantity =
      current === undefined
        ? capQuantity(guest.quantity, stock)
        : stock > 0
          ? capQuantity(current + guest.quantity, stock)
          : capQuantity(Math.max(current, guest.quantity), stock);
    if (quantity !== current) writes.push({ variantId: guest.variantId, quantity });
  }
  return writes;
}
