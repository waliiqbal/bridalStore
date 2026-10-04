import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';

// The API requires this header on every state-changing request (CSRF protection).
export const CSRF_HEADERS = { 'X-Requested-With': 'XMLHttpRequest' };

// supertest with the CSRF header pre-set on writes.
export function api(app: INestApplication) {
  const server = app.getHttpServer();
  return {
    get: (url: string) => request(server).get(url),
    post: (url: string) => request(server).post(url).set(CSRF_HEADERS),
    put: (url: string) => request(server).put(url).set(CSRF_HEADERS),
    patch: (url: string) => request(server).patch(url).set(CSRF_HEADERS),
    delete: (url: string) => request(server).delete(url).set(CSRF_HEADERS),
  };
}

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  return app;
}

// Logs in as the seeded owner and returns the Cookie header for /api/admin/* calls.
export async function loginAsAdmin(app: INestApplication): Promise<string> {
  const res = await api(app)
    .post('/api/admin/auth/login')
    .send({
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
    })
    .expect(200);

  const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = setCookie?.find((c) => c.startsWith('admin_token='));
  if (!cookie) throw new Error('Admin login did not set the admin_token cookie');
  return cookie.split(';')[0];
}
