import { describe, expect, it } from 'vitest';
import { pgOptions } from './pg-options.js';

describe('pgOptions', () => {
  const base = 'postgresql://postgres.abc:p%40ss@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres';

  it('turns sslmode=require into an encrypted connection that does not check the certificate', () => {
    expect(pgOptions(`${base}?sslmode=require`)).toEqual({
      connectionString: base,
      ssl: { rejectUnauthorized: false },
    });
  });

  it('keeps the other settings in the address', () => {
    expect(pgOptions(`${base}?sslmode=require&connection_limit=5`)).toEqual({
      connectionString: `${base}?connection_limit=5`,
      ssl: { rejectUnauthorized: false },
    });
    expect(pgOptions(`${base}?connection_limit=5&sslmode=require`)).toEqual({
      connectionString: `${base}?connection_limit=5`,
      ssl: { rejectUnauthorized: false },
    });
  });

  it('leaves every other address alone (local database, verify-full, none)', () => {
    expect(pgOptions('postgresql://u:p@localhost:5432/db')).toEqual({
      connectionString: 'postgresql://u:p@localhost:5432/db',
    });
    expect(pgOptions(`${base}?sslmode=verify-full`)).toEqual({ connectionString: `${base}?sslmode=verify-full` });
  });
});
