import type { PoolConfig } from 'pg';

/**
 * Connection settings for the `pg` driver, built from DATABASE_URL.
 *
 * Hosted databases (Supabase, Neon, ...) ask for `?sslmode=require`, meaning "encrypt the
 * connection". The newer `pg` driver reads `require` as `verify-full` ("also check the server's
 * certificate against the public certificate authorities"), and hosted databases use their own
 * certificate authority, so the connection is refused with "self-signed certificate in certificate
 * chain". This gives `require` the meaning every other tool gives it: encrypted, certificate not
 * checked. Any other mode (`verify-full`, `disable`, none) is left exactly as written.
 */
export function pgOptions(connectionString: string): PoolConfig {
  const requireMode = /[?&]sslmode=require(&|$)/i.test(connectionString);
  if (!requireMode) return { connectionString };
  const withoutMode = connectionString
    .replace(/([?&])sslmode=require(&|$)/i, (_m, lead: string, tail: string) => (tail ? lead : ''))
    .replace(/[?&]$/, '');
  return { connectionString: withoutMode, ssl: { rejectUnauthorized: false } };
}
