import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import {
  createLongoPrazoCatalog,
  LongoPrazoCatalog,
} from './factories/longo-prazo.factory';
import { createApiApp } from './utils/api-app';
import { truncateAllTables } from './utils/database';
import { signUp, TestSession } from './utils/session';

interface Owner {
  session: TestSession;
  portfolioId: string;
}

/**
 * RN02, RN12 with a real database (BK-2, M2): two users hold the same asset in their own portfolios at the same time.
 * Removing the portfolio filter from the history, the command timeline or the positions query fails this file.
 */
describe('Isolation between portfolios of two users (E2E, RN02, RN07, RN12)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let catalog: LongoPrazoCatalog;
  let ana: Owner;
  let bruno: Owner;
  const http = () => request(app.getHttpServer());

  async function owner(email: string, name: string): Promise<Owner> {
    const session = await signUp(app, email, name);
    const created = await http()
      .post('/api/v1/portfolios')
      .set('Authorization', session.bearer)
      .send({ name: 'Longo prazo' })
      .expect(201);
    return { session, portfolioId: (created.body as { id: string }).id };
  }

  function post(who: Owner, body: object) {
    return http()
      .post(`/api/v1/portfolios/${who.portfolioId}/operations`)
      .set('Authorization', who.session.bearer)
      .send(body);
  }

  function get<T>(who: Owner, path: string): Promise<T> {
    return http()
      .get(`/api/v1/portfolios/${who.portfolioId}${path}`)
      .set('Authorization', who.session.bearer)
      .expect(200)
      .then((response) => response.body as T);
  }

  function operation(
    ticker: string,
    type: 'BUY' | 'SELL',
    quantity: string,
    unitPrice: string,
  ) {
    return {
      assetId: catalog.assets[ticker],
      brokerId: catalog.brokers['XP Investimentos'],
      type,
      tradeDate: type === 'BUY' ? '2026-01-05' : '2026-06-02',
      quantity,
      unitPrice,
      fees: '0',
    };
  }

  beforeAll(async () => {
    app = await createApiApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    catalog = await createLongoPrazoCatalog(prisma);
    ana = await owner('ana@example.com', 'Ana Souza');
    bruno = await owner('bruno@example.com', 'Bruno Lima');
    // Both portfolios get PETR4 at the same time; only Ana's gets ITSA4.
    const responses = await Promise.all([
      post(ana, operation('PETR4', 'BUY', '100', '30')),
      post(ana, operation('ITSA4', 'BUY', '50', '10')),
      post(bruno, operation('PETR4', 'BUY', '30', '20')),
    ]);
    expect(responses.map((response) => response.status)).toEqual([
      201, 201, 201,
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('shows in the history, positions, totals and counts of each portfolio only its own operations', async () => {
    const history = await get<{ total: number; items: { quantity: string }[] }>(
      bruno,
      '/operations',
    );
    expect(history.total).toBe(1);
    expect(history.items).toMatchObject([{ quantity: '30' }]);
    expect((await get<{ total: number }>(ana, '/operations')).total).toBe(2);

    const positions = await get<
      { asset: { ticker: string }; quantity: string }[]
    >(bruno, '/positions');
    expect(positions).toMatchObject([
      { asset: { ticker: 'PETR4' }, quantity: '30' },
    ]);
    expect(positions).toHaveLength(1);

    expect(
      await get<{ totalCost: { value: string }; assetCount: number }>(
        bruno,
        '/summary',
      ),
    ).toMatchObject({ totalCost: { value: '600' }, assetCount: 1 });
    expect(
      await get<{ totalCost: { value: string }; assetCount: number }>(
        ana,
        '/summary',
      ),
    ).toMatchObject({ totalCost: { value: '3500' }, assetCount: 2 });

    expect(
      await get<{ operationCount: number; assetCount: number }>(bruno, ''),
    ).toMatchObject({ operationCount: 1, assetCount: 1 });
  });

  it('rejects a sell in a portfolio without units of the asset (RN07), even with units in the other user’s portfolio', async () => {
    const response = await post(bruno, operation('ITSA4', 'SELL', '10', '12'));

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      violation: { rule: 'RN07', availableQuantity: '0', soldQuantity: '10' },
    });
    expect(
      await prisma.operation.count({
        where: { portfolioId: bruno.portfolioId },
      }),
    ).toBe(1);
  });
});
