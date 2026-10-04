import type { CookieOptions } from 'express';

export const DAY_MS = 24 * 60 * 60 * 1000;

// httpOnly session cookies; secure (HTTPS-only) in production.
export function sessionCookieOptions(production: boolean, maxAgeDays?: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: production,
    path: '/',
    ...(maxAgeDays !== undefined && { maxAge: maxAgeDays * DAY_MS }),
  };
}
