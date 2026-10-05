export function testDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be set in .env to run e2e tests');
  }
  const url = new URL(databaseUrl);
  const dbName = url.pathname.replace(/^\//, '');
  if (!dbName) throw new Error('DATABASE_URL has no database name');
  if (!dbName.endsWith('_test')) url.pathname = `/${dbName}_test`;
  return url.toString();
}
