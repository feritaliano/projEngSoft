import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import { truncateAllTables } from './utils/database';

const PROBLEM_JSON = 'application/problem+json; charset=utf-8';

/**
 * The global setup raises AUTH_RATE_LIMIT_MAX for the other suites. The ConfigModule reads the env when ApiModule is
 * first loaded, so this file drops the variable and only then loads the app: the limit here is the default (A2, BK-1).
 * Each test gets its own app (fresh throttler storage), so the result does not depend on test order.
 */
describe('Auth rate limit with the default AUTH_RATE_LIMIT_MAX (E2E, A2, BK-1)', () => {
  let createApiApp: typeof import('./utils/api-app').createApiApp;
  let app: NestFastifyApplication;

  beforeAll(async () => {
    delete process.env.AUTH_RATE_LIMIT_MAX;
    ({ createApiApp } = await import('./utils/api-app.js'));
  });

  beforeEach(async () => {
    app = await createApiApp();
    await truncateAllTables(app.get(PrismaService));
  });

  afterEach(async () => {
    await app.close();
  });

  it('answers 429 problem+json after 5 login attempts per minute from the same client', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'ana@example.com', password: 'errada123' });

    for (let i = 0; i < 5; i += 1) {
      await attempt().expect(401);
    }
    const blocked = await attempt().expect(429);

    expect(blocked.headers['content-type']).toBe(PROBLEM_JSON);
    expect(blocked.body).toMatchObject({
      status: 429,
      title: 'Too Many Requests',
    });
  });

  it('answers 429 after 5 sign-up attempts per minute from the same client', async () => {
    // Invalid bodies (400) still count: the limit protects the endpoint, not only successful sign-ups.
    const attempt = () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'Ana', email: 'ana@example.com', password: 'short' });

    for (let i = 0; i < 5; i += 1) {
      await attempt().expect(400);
    }
    const blocked = await attempt().expect(429);

    expect(blocked.headers['content-type']).toBe(PROBLEM_JSON);
  });
});
