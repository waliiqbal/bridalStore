// The shopper's chosen currency, remembered in a cookie.
// The proxy reads it and sends the shopper to the matching copy of each page (see src/proxy.ts),
// so the pages themselves never read cookies and can be built once and served to everyone.
export const CURRENCY_COOKIE = "currency";

// The shop's own currency, used when a visitor hasn't chosen one (and for search engines)
export const DEFAULT_CURRENCY = "AUD";

// A currency code is three capital letters, like AUD or USD
export const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
