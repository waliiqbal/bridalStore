import 'dotenv/config';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { testDatabaseUrl } from './test/test-db.js';

const databaseUrl = testDatabaseUrl(process.env.DATABASE_URL);

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // E2E runs against "<db>_test", never the dev database.
    env: { DATABASE_URL: databaseUrl, NODE_ENV: 'test' },
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
    hookTimeout: 60_000,
  },
});
