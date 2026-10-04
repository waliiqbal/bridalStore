import {
  generateResetToken,
  hashResetToken,
  looksLikeResetToken,
  RESET_TOKEN_TTL_MS,
  resetTokenExpiry,
  resetTokenState,
} from './reset-token.js';

describe('password reset tokens', () => {
  const now = new Date('2026-10-04T12:00:00Z');

  it('generates unguessable URL-safe tokens and stores only a hash', () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a.token).not.toBe(b.token);
    expect(looksLikeResetToken(a.token)).toBe(true);
    expect(a.tokenHash).toBe(hashResetToken(a.token));
    expect(a.tokenHash).not.toContain(a.token);
    expect(a.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('expires one hour after it is issued', () => {
    expect(resetTokenExpiry(now).getTime() - now.getTime()).toBe(RESET_TOKEN_TTL_MS);
    expect(RESET_TOKEN_TTL_MS).toBe(60 * 60 * 1000);
  });

  it('walks through its lifecycle: valid → used, or valid → expired', () => {
    const expiresAt = resetTokenExpiry(now);
    expect(resetTokenState({ expiresAt, usedAt: null }, now)).toBe('VALID');
    expect(resetTokenState({ expiresAt, usedAt: new Date(now.getTime() + 1000) }, now)).toBe('USED');
    expect(resetTokenState({ expiresAt, usedAt: null }, new Date(expiresAt.getTime() - 1))).toBe('VALID');
    expect(resetTokenState({ expiresAt, usedAt: null }, expiresAt)).toBe('EXPIRED');
    expect(resetTokenState(null, now)).toBe('NOT_FOUND');
  });

  it('a used token stays used even before it would expire', () => {
    expect(resetTokenState({ expiresAt: resetTokenExpiry(now), usedAt: now }, now)).toBe('USED');
  });

  it('rejects malformed tokens without a lookup', () => {
    expect(looksLikeResetToken('short')).toBe(false);
    expect(looksLikeResetToken(`${'a'.repeat(42)}!`)).toBe(false);
    expect(looksLikeResetToken('a'.repeat(43))).toBe(true);
  });
});
