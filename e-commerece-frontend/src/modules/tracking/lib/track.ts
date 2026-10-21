// The four shopping events the owner asked for, sent to Meta Pixel and Google Analytics (GA4)
// when those are set up in Settings. If neither is set up, these do nothing.
//
// Items use the variant's SKU as their ID, the same ID the Facebook/Instagram product feed uses,
// so Meta can match what people viewed and bought to the catalogue.

type Fbq = (
  command: string,
  event: string,
  data?: Record<string, unknown>,
  options?: { eventID: string },
) => void;
type Gtag = (command: "event", event: string, data: Record<string, unknown>) => void;

declare global {
  interface Window {
    fbq?: Fbq;
    gtag?: Gtag;
  }
}

export interface TrackedItem {
  sku: string;
  name: string;
  // Price of one, in cents of the shopper's currency
  unitPrice: number;
  quantity: number;
}

// Whole units (12000 cents → 120)
const units = (cents: number) => Math.round(cents) / 100;

function send(
  meta: [string, Record<string, unknown>],
  ga: [string, Record<string, unknown>],
  eventID?: string,
) {
  if (typeof window === "undefined") return;
  try {
    // The event ID lets Meta ignore a repeat of the same event (for example a page reload)
    window.fbq?.("track", meta[0], meta[1], eventID ? { eventID } : undefined);
    window.gtag?.("event", ga[0], ga[1]);
  } catch {
    // Tracking must never break the shop
  }
}

const gaItems = (items: TrackedItem[]) =>
  items.map((i) => ({ item_id: i.sku, item_name: i.name, price: units(i.unitPrice), quantity: i.quantity }));

const metaContents = (items: TrackedItem[]) =>
  items.map((i) => ({ id: i.sku, quantity: i.quantity, item_price: units(i.unitPrice) }));

const valueOf = (items: TrackedItem[]) => items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

export function trackViewContent(item: TrackedItem, currency: string) {
  const value = units(item.unitPrice);
  send(
    [
      "ViewContent",
      { content_type: "product", content_ids: [item.sku], content_name: item.name, value, currency },
    ],
    ["view_item", { currency, value, items: gaItems([item]) }],
  );
}

export function trackAddToCart(item: TrackedItem, currency: string) {
  const value = units(valueOf([item]));
  send(
    [
      "AddToCart",
      { content_type: "product", content_ids: [item.sku], contents: metaContents([item]), value, currency },
    ],
    ["add_to_cart", { currency, value, items: gaItems([item]) }],
  );
}

export function trackInitiateCheckout(items: TrackedItem[], currency: string) {
  const value = units(valueOf(items));
  send(
    [
      "InitiateCheckout",
      {
        content_type: "product",
        content_ids: items.map((i) => i.sku),
        contents: metaContents(items),
        num_items: items.length,
        value,
        currency,
      },
    ],
    ["begin_checkout", { currency, value, items: gaItems(items) }],
  );
}

// `totalCents` is what the customer paid (the order total). Sent once per order, even if the
// "thank you" page is reloaded.
export function trackPurchase(
  orderNumber: string,
  items: TrackedItem[],
  totalCents: number,
  currency: string,
) {
  const key = `purchase-tracked:${orderNumber}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Private mode: the event ID below still stops Meta counting it twice
  }
  const value = units(totalCents);
  send(
    [
      "Purchase",
      {
        content_type: "product",
        content_ids: items.map((i) => i.sku),
        contents: metaContents(items),
        value,
        currency,
      },
    ],
    ["purchase", { transaction_id: orderNumber, currency, value, items: gaItems(items) }],
    `purchase-${orderNumber}`,
  );
}
