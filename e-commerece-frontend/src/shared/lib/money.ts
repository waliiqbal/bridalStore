// Every money value from the API is { amount (integer cents), currencyCode }.
export interface Money {
  amount: number;
  currencyCode: string;
}

// The ONE place prices are turned into text for display.
export function formatMoney(money: Money, locale = "en-AU"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: money.currencyCode }).format(
    money.amount / 100,
  );
}

// Form helpers: the owner types dollars ("1899.50"), the API wants integer cents.
// Pure string/integer maths, so there are no floating-point rounding surprises.
export function centsToInputText(cents: number | null): string {
  if (cents == null) return "";
  const whole = Math.floor(cents / 100);
  const part = String(cents % 100).padStart(2, "0");
  return `${whole}.${part}`;
}

export const MONEY_INPUT_PATTERN = /^\d{0,7}(\.\d{0,2})?$/;

export function inputTextToCents(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed === ".") return null;
  const [whole = "0", fraction = ""] = trimmed.split(".");
  return Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}
