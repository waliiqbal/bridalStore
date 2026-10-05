import 'dotenv/config';
import { execSync } from 'node:child_process';
import pg from 'pg';
import { testDatabaseUrl } from './test-db.js';

// Creates the test database if needed, applies migrations and seeds it.
export default async function setup() {
  const testUrl = testDatabaseUrl(process.env.DATABASE_URL);
  const dbName = new URL(testUrl).pathname.slice(1);

  const admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await admin.connect();
  try {
    const { rowCount } = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName],
    );
    if (!rowCount) await admin.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await admin.end();
  }

  const env = { ...process.env, DATABASE_URL: testUrl };
  execSync('npx prisma migrate deploy', { env, stdio: 'ignore' });
  execSync('npx prisma db seed', { env, stdio: 'ignore' });
}
