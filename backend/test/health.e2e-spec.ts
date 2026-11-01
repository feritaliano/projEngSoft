import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { ConfigService } from '@nestjs/config';
import request from 'supertest';
import type { WorkerEnv } from '../src/config/env';
import {
  DATABASE_CONNECTION_TIMEOUT_MS,
  PrismaService,
} from '../src/shared/infrastructure/prisma/prisma.service';
import { createApiApp } from './utils/api-app';
import { truncateAllTables } from './utils/database';

const PROBLEM_JSON = 'application/problem+json; charset=utf-8';

describe('API skeleton (E2E, D52)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createApiApp();
  });

  beforeEach(async () => {
    await truncateAllTables(app.get(PrismaService));
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health answers 200 with the database up', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      details: { database: { status: 'up' } },
    });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('an unknown route answers 404 in problem+json', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/does-not-exist')
      .expect(404);

    expect(response.headers['content-type']).toBe(PROBLEM_JSON);
    expect(response.body).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'Cannot GET /api/v1/does-not-exist',
      instance: '/api/v1/does-not-exist',
    });
  });

  it('migrations were applied by the global setup (public and ops)', async () => {
    const [tables] = await app.get(PrismaService).$queryRaw<
      { operations: boolean; sessions: boolean }[]
    >`
      SELECT to_regclass('public.operations') IS NOT NULL AS operations,
             to_regclass('ops.user_sessions') IS NOT NULL AS sessions`;

    expect(tables).toEqual({ operations: true, sessions: true });
  });
});

/** The real PrismaService (with its connection timeout) pointed at another database URL. */
function prismaServiceFor(databaseUrl: string): PrismaService {
  return new PrismaService({
    get: () => databaseUrl,
  } as unknown as ConfigService<WorkerEnv, true>);
}

describe('API skeleton with the database down (E2E, D52)', () => {
  let app: NestFastifyApplication;
  let unreachable: PrismaService;

  beforeAll(async () => {
    // Port 1 on localhost refuses connections: a real connection failure, not a mock.
    unreachable = prismaServiceFor(
      'postgresql://nobody:nothing@127.0.0.1:1/none',
    );
    app = await createApiApp((builder) =>
      builder.overrideProvider(PrismaService).useValue(unreachable),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health answers 503 in problem+json without connection details', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(503);

    expect(response.headers['content-type']).toBe(PROBLEM_JSON);
    expect(response.body).toEqual({
      type: 'about:blank',
      title: 'Service Unavailable',
      status: 503,
      detail: 'One or more dependencies are unavailable.',
      checks: { database: 'down' },
      instance: '/api/v1/health',
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /127\.0\.0\.1|nothing|ECONNREFUSED/,
    );
  });
});

describe('API skeleton with a database host that never answers (E2E, D52)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    // 10.255.255.1 is not routable: packets are dropped, so only the connection timeout ends the attempt.
    app = await createApiApp((builder) =>
      builder
        .overrideProvider(PrismaService)
        .useValue(
          prismaServiceFor(
            'postgresql://nobody:nothing@10.255.255.1:5432/none',
          ),
        ),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health answers 503 within the connection timeout instead of hanging', async () => {
    const started = Date.now();

    await request(app.getHttpServer()).get('/api/v1/health').expect(503);

    expect(Date.now() - started).toBeLessThan(
      DATABASE_CONNECTION_TIMEOUT_MS + 3_000,
    );
  }, 20_000);
});
