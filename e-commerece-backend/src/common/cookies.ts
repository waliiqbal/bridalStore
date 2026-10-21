import type { CookieOptions } from 'express';

export const DAY_MS = 24 * 60 * 60 * 1000;

// When the website and the API live on different subdomains (shop.example.com and
// api.example.com), the website's own server must be able to read the sign-in cookies too, so they
// are set for the whole parent domain (".example.com"). Set once at start-up from COOKIE_DOMAIN;
// empty means "this host only" (local development).
let cookieDomain: string | undefined;
export function setCookieDomain(domain: string | undefined): void {
  cookieDomain = domain || undefined;
}

// httpOnly session cookies; secure (HTTPS-only) in production. Used for every cookie we set AND
// clear, because a cookie can only be cleared with the same domain and path it was set with.
export function sessionCookieOptions(production: boolean, maxAgeDays?: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: production,
    path: '/',
    ...(cookieDomain && { domain: cookieDomain }),
    ...(maxAgeDays !== undefined && { maxAge: maxAgeDays * DAY_MS }),
  };
}
