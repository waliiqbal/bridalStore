import { createHash, randomBytes } from 'node:crypto';

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// 32 random bytes, URL-safe. Only the hash is stored; the token goes in the email.
export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function resetTokenExpiry(now = new Date()): Date {
  return new Date(now.getTime() + RESET_TOKEN_TTL_MS);
}

export type ResetTokenState = 'VALID' | 'NOT_FOUND' | 'USED' | 'EXPIRED';

export function resetTokenState(
  row: { expiresAt: Date; usedAt: Date | null } | null,
  now = new Date(),
): ResetTokenState {
  if (!row) return 'NOT_FOUND';
  if (row.usedAt) return 'USED';
  if (row.expiresAt <= now) return 'EXPIRED';
  return 'VALID';
}

// Cheap format check before touching the database (43 base64url chars).
export function looksLikeResetToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
