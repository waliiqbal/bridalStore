import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, loginAsAdmin } from './helpers/app.js';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health reports the database as connected', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', database: 'connected' });
  });

  it('protects admin routes and accepts the seeded admin cookie', async () => {
    await request(app.getHttpServer()).get('/api/admin/auth/me').expect(401);

    const cookie = await loginAsAdmin(app);
    const res = await request(app.getHttpServer())
      .get('/api/admin/auth/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.admin.email).toBe(process.env.SEED_ADMIN_EMAIL);
  });
});
