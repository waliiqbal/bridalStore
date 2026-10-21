import { afterEach, describe, expect, it } from 'vitest';
import { validateEnv } from '../config/env.validation.js';
import { sessionCookieOptions, setCookieDomain } from './cookies.js';

describe('sessionCookieOptions', () => {
  afterEach(() => setCookieDomain(undefined));

  it('is httpOnly and lax, and only secure in production', () => {
    expect(sessionCookieOptions(false)).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
    expect(sessionCookieOptions(true, 7)).toMatchObject({ secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  });

  it('sets the parent domain on every cookie (and clears with the same one) when configured', () => {
    setCookieDomain('.example.com');
    expect(sessionCookieOptions(true, 30)).toMatchObject({ domain: '.example.com' });
    expect(sessionCookieOptions(true)).toMatchObject({ domain: '.example.com' });
  });

  it('has no domain when it is left empty', () => {
    setCookieDomain('');
    expect(sessionCookieOptions(true)).not.toHaveProperty('domain');
  });
});

describe('COOKIE_DOMAIN in the environment', () => {
  const base = {
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    JWT_SECRET: 'a'.repeat(40),
    CUSTOMER_JWT_SECRET: 'b'.repeat(40),
    FRONTEND_URL: 'http://localhost:3001',
  };

  it('accepts a parent domain and rejects a web address', () => {
    expect(validateEnv({ ...base, COOKIE_DOMAIN: '.malikah.com.au' }).COOKIE_DOMAIN).toBe('.malikah.com.au');
    expect(() => validateEnv({ ...base, COOKIE_DOMAIN: 'https://malikah.com.au' })).toThrow(/COOKIE_DOMAIN/);
    expect(validateEnv(base).COOKIE_DOMAIN).toBeUndefined();
  });
});
