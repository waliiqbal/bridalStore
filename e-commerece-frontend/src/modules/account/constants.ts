// Cookie set by the backend on customer login (httpOnly, so JavaScript can't read it)
export const CUSTOMER_COOKIE = "customer_token";

export const LOGIN_PATH = "/login";
export const ACCOUNT_HOME_PATH = "/account/orders";

// Where to send someone after they sign in. Only addresses inside this site are allowed,
// so a crafted link can't send people to another website.
export function safeNext(value: string | string[] | undefined, fallback = ACCOUNT_HOME_PATH): string {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next === LOGIN_PATH || next.startsWith(`${LOGIN_PATH}?`)) return fallback;
  return next;
}
