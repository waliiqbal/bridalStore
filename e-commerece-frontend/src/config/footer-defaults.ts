// The wording above the footer until the owner changes it (Admin → Settings → Footer). Promises that
// were never saved (null) use these; an empty list hides the whole strip.
export interface FooterPromise {
  title: string;
  text: string;
}

export const FOOTER_DEFAULTS = {
  promises: [
    { title: "Shipped worldwide", text: "Delivery to your country, priced at checkout" },
    { title: "Secure payment", text: "Pay by card or PayPal" },
    { title: "Personal help", text: "Tell us your event and we will help you choose" },
  ] satisfies FooterPromise[],
};

export const MAX_FOOTER_PROMISES = 3;

// The payment logos the owner can switch on
export const PAYMENT_ICON_OPTIONS = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "paypal", label: "PayPal" },
  { value: "amex", label: "American Express" },
  { value: "applepay", label: "Apple Pay" },
] as const;

// The promises from the API (or the built-in ones when never saved). Rows without a title are dropped.
export function resolvePromises(saved: FooterPromise[] | null | undefined): FooterPromise[] {
  const list = saved ?? FOOTER_DEFAULTS.promises;
  return list.filter((promise) => promise.title.trim() !== "").slice(0, MAX_FOOTER_PROMISES);
}
