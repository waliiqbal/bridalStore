import 'dotenv/config';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    env: {
      DATABASE_URL: databaseUrl,
      NODE_ENV: 'test',
      STORAGE_DRIVER: 'local',
      UPLOADS_DIR: join(tmpdir(), 'mbs-e2e-uploads'),
      UPLOADS_PUBLIC_URL: 'http://localhost:3000/uploads',
      // test/helpers/revalidate-server.ts listens here and records the calls
      FRONTEND_REVALIDATE_URL: 'http://127.0.0.1:39555/api/revalidate',
      REVALIDATE_SECRET: 'e2e-revalidate-secret-0123456789abcdef',
    },
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
    hookTimeout: 60_000,
  },
});
