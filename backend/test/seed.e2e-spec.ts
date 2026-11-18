import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { Money } from '../src/shared/domain/money';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import {
  bodyOf,
  LONGO_PRAZO_OPERATIONS,
  LongoPrazoCatalog,
} from './factories/longo-prazo.factory';
import { createApiApp } from './utils/api-app';
import { truncateAllTables } from './utils/database';
import { runSqlFile } from './utils/sql-file';
import { signUp, TestSession } from './utils/session';

// Seed users' password (comment in inserts.sql); development data only, never in .env.
const DEMO = { email: 'demo@carteirab3.dev', password: 'demo-carteira-2026' };
const LONGO_PRAZO_ID = '00000000-0000-0000-0000-000000001101';
const BRUNO_ACOES_BR_ID = '00000000-0000-0000-0000-000000001104';
const XP_ID = '00000000-0000-0000-0000-000000000101';
const FIRST_PETR4_BUY_ID = '00000000-0000-0000-0000-000000001301';

interface PositionBody {
  asset: { ticker: string | null; displayName: string };
  status: 'OPEN' | 'CLOSED';
  quantity: string;
  averagePrice: { value: string } | null;
  totalCost: { value: string } | null;
  realizedProfit: { value: string };
}

const cents = (value: string | undefined) =>
  value === undefined ? undefined : Money.of(value).toFixed(2);

/** One row per position, keyed by ticker (display name for fixed income), amounts rounded only here (RN11). */
function positionTable(lines: PositionBody[]) {
  return Object.fromEntries(
    lines.map((line) => [
      line.asset.ticker ?? line.asset.displayName,
      {
        status: line.status,
        quantity: line.quantity,
        averagePrice: cents(line.averagePrice?.value),
        totalCost: cents(line.totalCost?.value),
        realizedProfit: cents(line.realizedProfit.value),
      },
    ]),
  );
}

const open = (
  quantity: string,
  averagePrice: string,
  totalCost: string,
  realizedProfit = '0.00',
) => ({
  status: 'OPEN',
  quantity,
  averagePrice,
  totalCost,
  realizedProfit,
});

describe('Seed loaded through the API (integration, BK-3, A1, P1-2)', () => {
  let app: NestFastifyApplication;
  const http = () => request(app.getHttpServer());

  async function login(email: string, password: string): Promise<string> {
    const response = await http()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return `Bearer ${(response.body as { accessToken: string }).accessToken}`;
  }

  async function get<T>(path: string, bearer: string): Promise<T> {
    const response = await http()
      .get(`/api/v1${path}`)
      .set('Authorization', bearer)
      .expect(200);
    return response.body as T;
  }

  // The seed is the fixture of every test here: loaded once, never truncated between tests; each test only reads it
  // or writes under its own user.
  beforeAll(async () => {
    app = await createApiApp();
    await truncateAllTables(app.get(PrismaService));
    await runSqlFile('database/sql/inserts.sql');
    // Raises if the seed is inconsistent (catalog, handoff massa, IR, income).
    await runSqlFile('database/tests/seed-check.sql');
  });

  afterAll(async () => {
    await app.close();
  });

  it('enters the 9 operations of the handoff massa with the seed catalog and gets the expected positions and totals (A1, RN05–RN12)', async () => {
    const user: TestSession = await signUp(
      app,
      `bk3-${crypto.randomUUID()}@test.local`,
    );
    // Fails with 404 if an asset of the massa leaves the seed.
    const assets: Record<string, string> = {};
    for (const ticker of new Set(LONGO_PRAZO_OPERATIONS.map((o) => o.ticker))) {
      assets[ticker] = (
        await get<{ id: string }>(`/assets/${ticker}`, user.bearer)
      ).id;
    }
    const brokerList = await get<{ id: string; name: string }[]>(
      '/brokers',
      user.bearer,
    );
    const brokers = Object.fromEntries(brokerList.map((b) => [b.name, b.id]));
    const catalog: LongoPrazoCatalog = { assets, brokers };
    for (const name of new Set(LONGO_PRAZO_OPERATIONS.map((o) => o.broker))) {
      expect(brokers).toHaveProperty([name]);
    }

    const created = await http()
      .post('/api/v1/portfolios')
      .set('Authorization', user.bearer)
      .send({ name: 'Longo prazo' })
      .expect(201);
    const portfolioId = (created.body as { id: string }).id;
    for (const operation of LONGO_PRAZO_OPERATIONS) {
      await http()
        .post(`/api/v1/portfolios/${portfolioId}/operations`)
        .set('Authorization', user.bearer)
        .send(bodyOf(catalog, operation))
        .expect(201);
    }

    const summary = await get<{
      totalCost: { value: string };
      realizedProfit: { value: string };
      assetCount: number;
    }>(`/portfolios/${portfolioId}/summary`, user.bearer);
    const portfolio = await get<{ operationCount: number }>(
      `/portfolios/${portfolioId}`,
      user.bearer,
    );
    const positions = await get<PositionBody[]>(
      `/portfolios/${portfolioId}/positions`,
      user.bearer,
    );

    expect({
      totalCost: cents(summary.totalCost.value),
      realizedProfit: cents(summary.realizedProfit.value),
      assetCount: summary.assetCount,
      operationCount: portfolio.operationCount,
    }).toEqual({
      totalCost: '10051.27',
      realizedProfit: '693.87',
      assetCount: 4,
      operationCount: 9,
    });
    expect(positionTable(positions)).toEqual({
      PETR4: open('100', '32.03', '3203.27', '293.47'),
      ITSA4: open('300', '9.87', '2961.00'),
      BOVA11: open('20', '118.45', '2369.00'),
      MXRF11: open('150', '10.12', '1518.00', '-12.40'),
      WEGE3: expect.objectContaining({
        status: 'CLOSED',
        quantity: '0',
        realizedProfit: '412.80',
      }),
    });
  });

  it('shows the seeded demo portfolio "Longo prazo" with the handoff values (P1-2, D41)', async () => {
    const demo = await login(DEMO.email, DEMO.password);

    const portfolio = await get<{
      operationCount: number;
      assetCount: number;
      lastTradeDate: string | null;
    }>(`/portfolios/${LONGO_PRAZO_ID}`, demo);
    const summary = await get<{
      totalCost: { value: string };
      realizedProfit: { value: string };
      assetCount: number;
    }>(`/portfolios/${LONGO_PRAZO_ID}/summary`, demo);
    const positions = await get<PositionBody[]>(
      `/portfolios/${LONGO_PRAZO_ID}/positions`,
      demo,
    );

    expect(portfolio).toMatchObject({
      operationCount: 11,
      assetCount: 6,
      lastTradeDate: '2026-10-28',
    });
    expect({
      totalCost: cents(summary.totalCost.value),
      realizedProfit: cents(summary.realizedProfit.value),
      assetCount: summary.assetCount,
    }).toEqual({
      totalCost: '16151.27',
      realizedProfit: '693.87',
      assetCount: 6,
    });
    expect(positionTable(positions)).toEqual({
      PETR4: open('100', '32.03', '3203.27', '293.47'),
      MXRF11: open('150', '10.12', '1518.00', '-12.40'),
      ITSA4: open('300', '9.87', '2961.00'),
      BOVA11: open('20', '118.45', '2369.00'),
      'Tesouro IPCA+ 2035': open('0.52', '3846.15', '2000.00'),
      BTC: open('0.0125', '328000.00', '4100.00'),
      WEGE3: expect.objectContaining({
        status: 'CLOSED',
        quantity: '0',
        realizedProfit: '412.80',
      }),
    });
  });

  it('accepts the seed fixed ids, which are not RFC 4122 versions, in the history filter and the preview (BK-3, D42, D45)', async () => {
    const demo = await login(DEMO.email, DEMO.password);
    const petr4 = await get<{ id: string }>('/assets/PETR4', demo);

    const history = await get<{ total: number }>(
      `/portfolios/${LONGO_PRAZO_ID}/operations?assetId=${petr4.id}&brokerId=${XP_ID}`,
      demo,
    );
    await http()
      .post(`/api/v1/portfolios/${LONGO_PRAZO_ID}/operations/preview`)
      .set('Authorization', demo)
      .send({
        assetId: petr4.id,
        brokerId: XP_ID,
        type: 'BUY',
        tradeDate: '2026-01-05',
        quantity: '100',
        unitPrice: '29.95',
        fees: '5.00',
        replacesOperationId: FIRST_PETR4_BUY_ID,
      })
      .expect(200);

    expect(history.total).toBe(3);
  });

  it("keeps another user's seeded portfolio out of reach of the demo user (BK-2, RN02)", async () => {
    const demo = await login(DEMO.email, DEMO.password);

    const portfolios = await get<{ name: string }[]>('/portfolios', demo);

    // Exactly the demo's three: Bruno's "Ações BR" (also with PETR4) is not listed.
    expect(portfolios.map((p) => p.name).sort()).toEqual([
      'Dividendos',
      'Longo prazo',
      'Testes FII',
    ]);
    await http()
      .get(`/api/v1/portfolios/${BRUNO_ACOES_BR_ID}/summary`)
      .set('Authorization', demo)
      .expect(404);
  });
});
