import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import { createApiApp } from './utils/api-app';
import { truncateAllTables } from './utils/database';
import { signUp, TestSession } from './utils/session';

const PROBLEM_JSON = 'application/problem+json; charset=utf-8';
const ANY_PORTFOLIO = '3f1c2b9e-8d4a-4c6f-9b1e-2a7d5c8e0f13';

// Contract of S1+ (D64): the routes need a session (D59); the asset routes answer 501 until K8 replaces this file's
// expectations with its own E2E. The portfolio routes (K7) are covered by portfolio-market.e2e-spec.ts.
describe('S1+ market routes (E2E, D64)', () => {
  let app: NestFastifyApplication;
  let ana: TestSession;
  const http = () => request(app.getHttpServer());

  const ROUTES = [
    ['/api/v1/assets/PETR4/quotes', 'K8'],
    ['/api/v1/assets/PETR4/performance?period=P5Y', 'K8'],
  ];
  const PORTFOLIO_ROUTES = [
    '/api/v1/portfolios/totals',
    `/api/v1/portfolios/${ANY_PORTFOLIO}/allocation`,
    `/api/v1/portfolios/${ANY_PORTFOLIO}/evolution`,
    `/api/v1/portfolios/${ANY_PORTFOLIO}/performance`,
  ];

  beforeAll(async () => {
    app = await createApiApp();
    await truncateAllTables(app.get(PrismaService));
    ana = await signUp(app, 'ana@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([...ROUTES.map(([route]) => route), ...PORTFOLIO_ROUTES])(
    '%s needs a session (D59)',
    async (route) => {
      await http().get(route).expect(401);
    },
  );

  it.each(ROUTES)('%s answers 501 until %s', async (route, task) => {
    const response = await http()
      .get(route)
      .set('Authorization', ana.bearer)
      .expect(501);
    expect(response.headers['content-type']).toBe(PROBLEM_JSON);
    expect(response.body).toEqual({
      type: 'about:blank',
      title: 'Not Implemented',
      status: 501,
      detail: `Not implemented yet: arrives with ${task}.`,
      instance: route.split('?')[0],
    });
  });

  it.each(['quotes', 'performance'])(
    '%s rejects a period outside MarketPeriod with the field (D56)',
    async (route) => {
      const response = await http()
        .get(`/api/v1/assets/PETR4/${route}?period=P3M`)
        .set('Authorization', ana.bearer)
        .expect(400);
      expect(response.body).toMatchObject({
        errors: [{ field: 'period', code: 'INVALID_VALUE' }],
      });
    },
  );
});
