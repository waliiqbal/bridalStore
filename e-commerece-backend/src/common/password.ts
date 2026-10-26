import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// Password hashing with scrypt, which is part of Node itself (no native add-on). The previous
// choice, argon2, ships a compiled file that needs a recent Linux (glibc 2.34); some hosts have an
// older one and the API then cannot even start. scrypt with these settings is an accepted
// choice (OWASP) and works everywhere Node does.
//
// Stored as  scrypt$N$r$p$salt$hash  (salt and hash in base64). Hashes made earlier with argon2
// ($argon2id$...) still work: they are checked with the argon2 package when it can be loaded.

const COST = 2 ** 15; // N: memory/time cost
const BLOCK_SIZE = 8; // r
const PARALLEL = 1; // p
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
// scrypt needs about 128 * N * r bytes; Node's default limit (32 MB) is exactly too small for this N
const MAX_MEMORY = 128 * COST * BLOCK_SIZE * 2;

function derive(password: string, salt: Buffer, N: number, r: number, p: number): Promise<Buffer> {
  const options: ScryptOptions = { N, r, p, maxmem: Math.max(MAX_MEMORY, 256 * N * r) };
  return new Promise((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, options, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, COST, BLOCK_SIZE, PARALLEL);
  return ['scrypt', COST, BLOCK_SIZE, PARALLEL, salt.toString('base64'), key.toString('base64')].join('$');
}

// true only when `password` matches `stored`; never throws
export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  try {
    if (stored.startsWith('$argon2')) return await verifyLegacyArgon2(stored, password);
    const [scheme, n, r, p, salt, hash] = stored.split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const expected = Buffer.from(hash, 'base64');
    const actual = await derive(password, Buffer.from(salt, 'base64'), Number(n), Number(r), Number(p));
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

async function verifyLegacyArgon2(stored: string, password: string): Promise<boolean> {
  const argon2 = await import('argon2');
  return argon2.verify(stored, password);
}
