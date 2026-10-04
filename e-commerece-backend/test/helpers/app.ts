import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';

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
  const res = await request(app.getHttpServer())
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
