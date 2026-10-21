// Matches the backend's admin currency responses exactly (GET/POST /api/admin/currencies...).

export interface AdminCurrency {
  // ISO 4217, e.g. "USD"
  code: string;
  symbol: string;
  // How many units of this currency equal 1 Australian dollar, as text with 6 decimals ("0.650000")
  rateFromAud: string;
  // Converted prices are rounded UP to a multiple of this many cents (100 = whole units, 1 = never rounded)
  roundTo: number;
  // false = hidden from customers
  isEnabled: boolean;
  // The shop's own currency (AUD). It can't be changed or removed.
  isDefault: boolean;
  updatedAt: string;
}

export interface CurrencyInput {
  code?: string;
  symbol: string;
  rateFromAud: string;
  roundTo: number;
  isEnabled: boolean;
}
