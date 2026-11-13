import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import {
  createBroker,
  createIssuer,
  createListedAsset,
} from './factories/catalog.factory';
import { createOperation } from './factories/operation.factory';
import { createApiApp } from './utils/api-app';
import { truncateAllTables } from './utils/database';
import { signUp, TestSession } from './utils/session';

const PROBLEM_JSON = 'application/problem+json; charset=utf-8';

describe('Portfolios (E2E, B1, RN02, D41)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let ana: TestSession;
  const http = () => request(app.getHttpServer());

  async function createPortfolio(session: TestSession, name: string) {
    const response = await http()
      .post('/api/v1/portfolios')
      .set('Authorization', session.bearer)
      .send({ name })
      .expect(201);
    return response.body as { id: string; name: string };
  }

  beforeAll(async () => {
    app = await createApiApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ana = await signUp(app, 'ana@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('sign-up → login → create → list → delete (B1)', async () => {
    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'ana@example.com', password: 'segredo123' })
      .expect(200);
    const bearer = `Bearer ${login.body.accessToken as string}`;

    const created = await http()
      .post('/api/v1/portfolios')
      .set('Authorization', bearer)
      .send({ name: '  Longo prazo  ' })
      .expect(201);
    expect(created.body).toEqual({
      id: expect.any(String) as unknown,
      name: 'Longo prazo',
      operationCount: 0,
      assetCount: 0,
      lastTradeDate: null,
    });
    expect(created.headers['cache-control']).toBe('no-store');

    const list = await http()
      .get('/api/v1/portfolios')
      .set('Authorization', bearer)
      .expect(200);
    expect(list.body).toEqual([created.body]);
    expect(list.headers['cache-control']).toBe('no-store');

    await http()
      .delete(`/api/v1/portfolios/${created.body.id as string}`)
      .set('Authorization', bearer)
      .expect(204);
    const after = await http()
      .get('/api/v1/portfolios')
      .set('Authorization', bearer)
      .expect(200);
    expect(after.body).toEqual([]);
  });

  it('lists only the portfolios of the user, in creation order (RN02)', async () => {
    const bruno = await signUp(app, 'bruno@example.com', 'Bruno Lima');
    await createPortfolio(ana, 'Longo prazo');
    await createPortfolio(bruno, 'Do Bruno');
    await createPortfolio(ana, 'Dividendos');

    const list = await http()
      .get('/api/v1/portfolios')
      .set('Authorization', ana.bearer)
      .expect(200);

    expect((list.body as { name: string }[]).map((p) => p.name)).toEqual([
      'Longo prazo',
      'Dividendos',
    ]);
  });

  it("answers 404 to GET and DELETE of another user's portfolio and keeps it (RN02)", async () => {
    const bruno = await signUp(app, 'bruno@example.com', 'Bruno Lima');
    const portfolio = await createPortfolio(ana, 'Longo prazo');

    for (const method of ['get', 'delete'] as const) {
      const response = await http()
        [method](`/api/v1/portfolios/${portfolio.id}`)
        .set('Authorization', bruno.bearer)
        .expect(404);
      expect(response.headers['content-type']).toBe(PROBLEM_JSON);
    }
    expect(await prisma.portfolio.count()).toBe(1);

    await http()
      .get(`/api/v1/portfolios/${portfolio.id}`)
      .set('Authorization', ana.bearer)
      .expect(200);
  });

  it.each([
    ['a missing portfolio', '00000000-0000-4000-8000-000000000000'],
    ['a malformed id', 'abc'],
  ])('answers 404 for %s', async (_case, id) => {
    await http()
      .get(`/api/v1/portfolios/${id}`)
      .set('Authorization', ana.bearer)
      .expect(404);
    await http()
      .delete(`/api/v1/portfolios/${id}`)
      .set('Authorization', ana.bearer)
      .expect(404);
  });

  it('rejects a duplicated name with 409 field "name", only for the same user (RN02)', async () => {
    const bruno = await signUp(app, 'bruno@example.com', 'Bruno Lima');
    await createPortfolio(ana, 'Longo prazo');

    const duplicated = await http()
      .post('/api/v1/portfolios')
      .set('Authorization', ana.bearer)
      .send({ name: 'Longo prazo ' })
      .expect(409);
    expect(duplicated.headers['content-type']).toBe(PROBLEM_JSON);
    expect(duplicated.body).toMatchObject({ status: 409, field: 'name' });

    await createPortfolio(bruno, 'Longo prazo');
  });

  it.each([
    [
      'a blank name (domain)',
      { name: '   ' },
      { field: 'name', code: 'REQUIRED' },
    ],
    // PostgreSQL rejects NUL in text: without the domain check this would be a 500.
    [
      'a name with a NUL character',
      { name: 'Renda\u0000' },
      { field: 'name', code: 'INVALID_VALUE' },
    ],
    [
      'a name over 150 characters',
      { name: 'a'.repeat(151) },
      { field: 'name', code: 'TOO_LONG', params: { max: 150 } },
    ],
    [
      'an extra field',
      { name: 'Renda', userId: 'someone' },
      { field: 'userId', code: 'INVALID_VALUE' },
    ],
  ])(
    'rejects %s with 400 errors[].field and code (D56)',
    async (_case, payload, error) => {
      const response = await http()
        .post('/api/v1/portfolios')
        .set('Authorization', ana.bearer)
        .send(payload)
        .expect(400);

      expect(response.body.errors).toEqual([
        { ...error, message: expect.any(String) as unknown },
      ]);
      expect(await prisma.portfolio.count()).toBe(0);
    },
  );

  it('accepts a name of exactly 150 characters, counted as characters like VarChar(150) (RN02)', async () => {
    await createPortfolio(ana, 'a'.repeat(150));
    const emoji = await createPortfolio(ana, '💰'.repeat(150));
    expect(emoji.name).toBe('💰'.repeat(150));
  });

  it('treats names that differ only in case as different, like the UNIQUE (user_id, name) (RN02)', async () => {
    await createPortfolio(ana, 'Longo prazo');
    await createPortfolio(ana, 'longo prazo');

    expect(await prisma.portfolio.count()).toBe(2);
  });

  it('counts operations in the query and open positions from the timeline, then cascades the deletion (D41, RN09)', async () => {
    const portfolio = await createPortfolio(ana, 'Longo prazo');
    const other = await createPortfolio(ana, 'Testes FII');
    const issuer = await createIssuer(prisma);
    const broker = await createBroker(prisma);
    const otherBroker = await createBroker(prisma);
    const [petr4, wege3, itsa4] = await Promise.all(
      ['PETR4', 'WEGE3', 'ITSA4'].map((ticker) =>
        createListedAsset(prisma, { ticker, issuerId: issuer.id }),
      ),
    );
    const operation = (
      assetId: string,
      type: 'BUY' | 'SELL',
      tradeDate: string,
      quantity: string,
      brokerId = broker.id,
    ) =>
      createOperation(prisma, {
        portfolioId: portfolio.id,
        assetId,
        brokerId,
        type,
        tradeDate,
        quantity,
        unitPrice: '10.00',
      });
    // PETR4 open across two brokers (RN12); WEGE3 sold out: closed, not counted; ITSA4 open.
    await operation(petr4.id, 'BUY', '2026-01-05', '100');
    await operation(petr4.id, 'SELL', '2026-02-05', '40', otherBroker.id);
    await operation(wege3.id, 'BUY', '2026-01-06', '50');
    await operation(wege3.id, 'SELL', '2026-03-01', '50');
    const lastItsa4 = await operation(itsa4.id, 'BUY', '2026-01-07', '300');

    const summary = async () =>
      (
        await http()
          .get(`/api/v1/portfolios/${portfolio.id}`)
          .set('Authorization', ana.bearer)
          .expect(200)
      ).body as { operationCount: number; assetCount: number };

    expect(await summary()).toMatchObject({ operationCount: 5, assetCount: 2 });
    const list = await http()
      .get('/api/v1/portfolios')
      .set('Authorization', ana.bearer)
      .expect(200);
    expect(list.body).toEqual([
      {
        id: portfolio.id,
        name: 'Longo prazo',
        operationCount: 5,
        assetCount: 2,
        lastTradeDate: '2026-03-01',
      },
      {
        id: other.id,
        name: 'Testes FII',
        operationCount: 0,
        assetCount: 0,
        lastTradeDate: null,
      },
    ]);

    await prisma.operation.delete({ where: { id: lastItsa4.id } });
    expect(await summary()).toMatchObject({ operationCount: 4, assetCount: 1 });

    await http()
      .delete(`/api/v1/portfolios/${portfolio.id}`)
      .set('Authorization', ana.bearer)
      .expect(204);
    expect(
      await prisma.operation.count({ where: { portfolioId: portfolio.id } }),
    ).toBe(0);
    expect(await prisma.asset.count()).toBe(3);
  });

  it.each([
    ['GET', '/api/v1/portfolios'],
    ['POST', '/api/v1/portfolios'],
    ['GET', '/api/v1/portfolios/00000000-0000-4000-8000-000000000000'],
    ['DELETE', '/api/v1/portfolios/00000000-0000-4000-8000-000000000000'],
  ])('%s %s without a token answers 401', async (method, url) => {
    const response = await request(app.getHttpServer())
      [method.toLowerCase() as 'get' | 'post' | 'delete'](url)
      .send({ name: 'x' })
      .expect(401);

    expect(response.headers['content-type']).toBe(PROBLEM_JSON);
  });
});
