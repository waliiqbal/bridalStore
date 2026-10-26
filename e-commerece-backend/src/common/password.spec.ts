import * as argon2 from 'argon2';
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('accepts the right password and refuses a wrong one', async () => {
    const hash = await hashPassword('Mehndi-Night-2026');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword(hash, 'Mehndi-Night-2026')).toBe(true);
    expect(await verifyPassword(hash, 'mehndi-night-2026')).toBe(false);
    expect(await verifyPassword(hash, '')).toBe(false);
  });

  it('gives a different hash every time (random salt), and never contains the password', async () => {
    const [a, b] = await Promise.all([hashPassword('same password'), hashPassword('same password')]);
    expect(a).not.toBe(b);
    expect(a).not.toContain('same password');
  });

  it('refuses damaged or unknown hashes instead of throwing', async () => {
    expect(await verifyPassword('', 'x')).toBe(false);
    expect(await verifyPassword('scrypt$bad', 'x')).toBe(false);
    expect(await verifyPassword('plain-text-password', 'plain-text-password')).toBe(false);
    const hash = await hashPassword('abc12345678');
    const tampered = hash.slice(0, -4) + 'AAAA';
    expect(await verifyPassword(tampered, 'abc12345678')).toBe(false);
  });

  it('still accepts passwords stored earlier with argon2', async () => {
    const legacy = await argon2.hash('Old-Password-1234');
    expect(await verifyPassword(legacy, 'Old-Password-1234')).toBe(true);
    expect(await verifyPassword(legacy, 'wrong')).toBe(false);
  });

  it('treats the same letters in different Unicode forms as the same password', async () => {
    const hash = await hashPassword('café-password'); // é as one character
    expect(await verifyPassword(hash, 'café-password')).toBe(true); // e + accent
  });
});
