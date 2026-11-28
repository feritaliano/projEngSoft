import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { Decimal } from '../src/shared/domain/decimal';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import { createApiApp } from './utils/api-app';
import { truncateAllTables } from './utils/database';
import { runSqlFile } from './utils/sql-file';
import { signUp } from './utils/session';

// Seed users' password (comment in inserts.sql); development data only, never in .env.
const PASSWORD = 'demo-carteira-2026';
const LONGO_PRAZO = '00000000-0000-0000-0000-000000001101';
const DIVIDENDOS = '00000000-0000-0000-0000-000000001102';
const BRUNO_ACOES_BR = '00000000-0000-0000-0000-000000001104';
// Last trading day of the seed history (BD-4): every number is dated by it.
const CLOSE_DATE = '2026-11-12';
const MARKET_DATA = { source: 'B3_COTAHIST', closeDate: CLOSE_DATE };

interface DerivedValueBody {
  value: string;
  formulaCode: string;
  inputs: {
    name: string;
    value: string;
    referenceDate: string;
    portfolio?: { name: string };
  }[];
}

interface PositionBody {
  asset: { ticker: string | null; displayName: string; assetType: string };
  status: 'OPEN' | 'CLOSED';
  lastClose: { value: string; date: string; source: string } | null;
  unavailableReason?: string;
  marketValue: DerivedValueBody | null;
  dayChange: DerivedValueBody | null;
  dayChangePercent: DerivedValueBody | null;
  portfolioWeight: DerivedValueBody | null;
}

interface ComparisonBody {
  from: string;
  to: string;
  value: DerivedValueBody;
  cdi: DerivedValueBody | null;
  ibov: DerivedValueBody | null;
  ipca: DerivedValueBody | null;
}

interface ReturnsBody {
  total: ComparisonBody | null;
  last12Months: ComparisonBody | null;
  last12MonthsUnavailableReason?: string;
  last12MonthsAvailableFrom?: string;
}

const places = (value: string | undefined, digits: number) =>
  value === undefined ? undefined : new Decimal(value).toFixed(digits);
const cents = (derived: DerivedValueBody | null | undefined) =>
  places(derived?.value, 2);

/**
 * TWR of the seed computed by a separate script that shares no code with the backend (planilha do PR, critério do
 * G-S2a): Longo prazo has less than 12 months of history (first operation 05/01/2026); Dividendos (12/02/2025) has both.
 */
const INDEPENDENT = {
  longoPrazo: {
    total: '45.855734',
    cdi: '12.027010',
    ibov: '6.718393',
    ipca: '3.754459',
  },
  dividendos: {
    total: '0.282597',
    last12Months: '-7.357991',
    cdi12: '14.209049',
    ibov12: '8.685630',
    ipca12: '4.440368',
  },
};

describe('Portfolio with market data over the seed (E2E, K7: B8–B11, D64)', () => {
  let app: NestFastifyApplication;
  let demo: string;
  let bruno: string;
  const http = () => request(app.getHttpServer());

  async function login(email: string): Promise<string> {
    const response = await http()
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return `Bearer ${(response.body as { accessToken: string }).accessToken}`;
  }

  async function get<T>(path: string, bearer: string): Promise<T> {
    const response = await http()
      .get(`/api/v1${path}`)
      .set('Authorization', bearer)
      .expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    return response.body as T;
  }

  // The seed is the fixture: loaded once; tests only read it or write under a user of their own.
  beforeAll(async () => {
    app = await createApiApp();
    await truncateAllTables(app.get(PrismaService));
    await runSqlFile('database/sql/inserts.sql');
    [demo, bruno] = await Promise.all([
      login('demo@carteirab3.dev'),
      login('bruno.almeida@example.com'),
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('values "Longo prazo" at the closes of the last trading day of the seed, fixed income and crypto at cost (B8, D55)', async () => {
    const lines = await get<PositionBody[]>(
      `/portfolios/${LONGO_PRAZO}/positions`,
      demo,
    );

    // Classes by market value (D63): Ações 8.541, Cripto 4.100, ETFs 3.371, Renda fixa 2.000, FIIs 1.305.
    expect(
      lines.map((line) => [
        line.asset.ticker ?? line.asset.displayName,
        line.status,
        cents(line.marketValue),
        line.lastClose?.date ?? line.unavailableReason ?? null,
      ]),
    ).toEqual([
      ['ITSA4', 'OPEN', '4071.00', CLOSE_DATE],
      ['PETR4', 'OPEN', '4470.00', CLOSE_DATE],
      ['BTC', 'OPEN', '4100.00', 'NO_QUOTE'],
      ['BOVA11', 'OPEN', '3371.00', CLOSE_DATE],
      ['Tesouro IPCA+ 2035', 'OPEN', '2000.00', 'NO_QUOTE'],
      ['MXRF11', 'OPEN', '1305.00', CLOSE_DATE],
      ['WEGE3', 'CLOSED', undefined, null],
    ]);
    const petr4 = lines[1];
    expect(petr4.lastClose).toEqual({
      value: '44.7',
      date: CLOSE_DATE,
      source: 'B3_COTAHIST',
    });
    expect(petr4.marketValue?.formulaCode).toBe('MARKET_VALUE');
    // 100 × (44,70 − 43,55 of 11/11/2026).
    expect(cents(petr4.dayChange)).toBe('115.00');
    expect(places(petr4.dayChangePercent?.value, 6)).toBe(
      new Decimal(115).dividedBy(4355).times(100).toFixed(6),
    );
    expect(lines[2].marketValue?.formulaCode).toBe('MARKET_VALUE_AT_COST');
    expect(lines[6].marketValue).toBeNull();
    const weights = lines
      .filter((line) => line.portfolioWeight)
      .reduce(
        (sum, line) => sum.plus(line.portfolioWeight!.value),
        new Decimal(0),
      );
    expect(weights.toFixed(10)).toBe('100.0000000000');
  });

  it('adds the equity and the gain over the cost to the summary, with the close date (B8, D27)', async () => {
    const summary = await get<{
      totalCost: DerivedValueBody;
      equity: DerivedValueBody;
      unrealizedProfit: DerivedValueBody;
      unrealizedProfitPercent: DerivedValueBody;
      marketData: unknown;
    }>(`/portfolios/${LONGO_PRAZO}/summary`, demo);

    expect(cents(summary.totalCost)).toBe('16151.27');
    expect(cents(summary.equity)).toBe('19317.00');
    expect(cents(summary.unrealizedProfit)).toBe('3165.73');
    expect(summary.unrealizedProfitPercent.formulaCode).toBe(
      'PORTFOLIO_UNREALIZED_PROFIT_PERCENT',
    );
    expect(summary.marketData).toEqual(MARKET_DATA);
  });

  it('gives the TWR equal to the independent calculation, total and 12 months (B10, G-S2a)', async () => {
    const longoPrazo = await get<
      ReturnsBody & { series: { date: string; value: string }[] }
    >(`/portfolios/${LONGO_PRAZO}/performance`, demo);
    expect(longoPrazo.total).toMatchObject({
      from: '2026-01-05',
      to: CLOSE_DATE,
    });
    expect(places(longoPrazo.total?.value.value, 6)).toBe(
      INDEPENDENT.longoPrazo.total,
    );
    expect(places(longoPrazo.total?.cdi?.value, 6)).toBe(
      INDEPENDENT.longoPrazo.cdi,
    );
    expect(places(longoPrazo.total?.ibov?.value, 6)).toBe(
      INDEPENDENT.longoPrazo.ibov,
    );
    expect(places(longoPrazo.total?.ipca?.value, 6)).toBe(
      INDEPENDENT.longoPrazo.ipca,
    );
    // IPCA of the whole months 02/2026 to 10/2026: 11/2026 is published only in December.
    expect(
      longoPrazo.total?.ipca?.inputs.map((input) => input.referenceDate),
    ).toEqual(['2026-02-01', '2026-10-01']);
    expect(longoPrazo.last12Months).toBeNull();
    expect(longoPrazo.last12MonthsUnavailableReason).toBe('SHORT_HISTORY');
    expect(longoPrazo.last12MonthsAvailableFrom).toBe('2027-01-05');
    expect(longoPrazo.series).toHaveLength(11);
    expect(longoPrazo.series[0].date).toBe('2026-01-30');
    expect(longoPrazo.series[10]).toMatchObject({
      date: CLOSE_DATE,
      value: longoPrazo.total?.value.value,
    });

    const dividendos = await get<ReturnsBody>(
      `/portfolios/${DIVIDENDOS}/performance`,
      demo,
    );
    expect(places(dividendos.total?.value.value, 6)).toBe(
      INDEPENDENT.dividendos.total,
    );
    expect(dividendos.last12Months).toMatchObject({
      from: '2025-11-12',
      to: CLOSE_DATE,
    });
    expect(places(dividendos.last12Months?.value.value, 6)).toBe(
      INDEPENDENT.dividendos.last12Months,
    );
    expect(places(dividendos.last12Months?.cdi?.value, 6)).toBe(
      INDEPENDENT.dividendos.cdi12,
    );
    expect(places(dividendos.last12Months?.ibov?.value, 6)).toBe(
      INDEPENDENT.dividendos.ibov12,
    );
    expect(places(dividendos.last12Months?.ipca?.value, 6)).toBe(
      INDEPENDENT.dividendos.ipca12,
    );
  });

  it('draws the equity and the invested value month by month, ending on the close date (B11)', async () => {
    const evolution = await get<{
      points: { date: string; equity: string; invested: string }[];
      marketData: unknown;
    }>(`/portfolios/${LONGO_PRAZO}/evolution`, demo);

    expect(evolution.points).toHaveLength(11);
    expect(evolution.points[0].date).toBe('2026-01-30');
    const last = evolution.points[10];
    expect([
      last.date,
      places(last.equity, 2),
      places(last.invested, 2),
    ]).toEqual([CLOSE_DATE, '19317.00', '16151.27']);
    expect(evolution.marketData).toEqual(MARKET_DATA);
  });

  it('allocates by class and by sector over the equity (B9)', async () => {
    const allocation = await get<{
      byClass: {
        assetType: string;
        value: DerivedValueBody;
        percent: DerivedValueBody;
      }[];
      bySector: { sector: string | null; value: DerivedValueBody }[];
    }>(`/portfolios/${LONGO_PRAZO}/allocation`, demo);

    expect(
      allocation.byClass.map((group) => [group.assetType, cents(group.value)]),
    ).toEqual([
      ['STOCK', '8541.00'],
      ['CRYPTO', '4100.00'],
      ['ETF', '3371.00'],
      ['FIXED_INCOME', '2000.00'],
      ['FII', '1305.00'],
    ]);
    const sectors = allocation.bySector;
    expect(sectors[sectors.length - 1].sector).toBeNull();
    expect(
      sectors
        .reduce((sum, group) => sum.plus(group.value.value), new Decimal(0))
        .toFixed(2),
    ).toBe('19317.00');
  });

  it('sums the equity of each user only, with two users at the same time (isolation, RN02)', async () => {
    const [demoList, brunoList, demoTotals, brunoTotals] = await Promise.all([
      get<
        ({
          id: string;
          equity: DerivedValueBody;
          returns: ReturnsBody;
        } & object)[]
      >('/portfolios', demo),
      get<{ id: string; equity: DerivedValueBody }[]>('/portfolios', bruno),
      get<{ equity: DerivedValueBody; marketData: unknown }>(
        '/portfolios/totals',
        demo,
      ),
      get<{ equity: DerivedValueBody }>('/portfolios/totals', bruno),
    ]);

    expect(demoList.map((portfolio) => portfolio.id)).toEqual(
      expect.arrayContaining([LONGO_PRAZO, DIVIDENDOS]),
    );
    expect(brunoList.map((portfolio) => portfolio.id)).toEqual([
      BRUNO_ACOES_BR,
    ]);
    const longoPrazo = demoList.find(
      (portfolio) => portfolio.id === LONGO_PRAZO,
    )!;
    expect(cents(longoPrazo.equity)).toBe('19317.00');
    expect(places(longoPrazo.returns.total?.value.value, 6)).toBe(
      INDEPENDENT.longoPrazo.total,
    );
    expect(longoPrazo.returns.last12MonthsAvailableFrom).toBe('2027-01-05');
    expect(longoPrazo).not.toHaveProperty('returns.series');

    // Longo prazo 19.317,00 + Dividendos 7.856,30 + Testes FII 0.
    expect(cents(demoTotals.equity)).toBe('27173.30');
    expect(
      demoTotals.equity.inputs.map((input) => input.portfolio?.name),
    ).toEqual(['Dividendos', 'Longo prazo', 'Testes FII']);
    expect(demoTotals.marketData).toEqual(MARKET_DATA);
    expect(cents(brunoTotals.equity)).toBe('8336.00');
    expect(
      brunoTotals.equity.inputs.map((input) => input.portfolio?.name),
    ).toEqual(['Ações BR']);
  });

  it.each(['positions', 'summary', 'allocation', 'evolution', 'performance'])(
    '%s of a portfolio of another user answers 404 (RN02)',
    async (route) => {
      await http()
        .get(`/api/v1/portfolios/${BRUNO_ACOES_BR}/${route}`)
        .set('Authorization', demo)
        .expect(404);
    },
  );

  it('values an operation on a day without trading by the previous close (14/11/2026 is a Saturday)', async () => {
    const user = await signUp(app, `k7-${crypto.randomUUID()}@test.local`);
    const portfolio = (
      await http()
        .post('/api/v1/portfolios')
        .set('Authorization', user.bearer)
        .send({ name: 'Sábado' })
        .expect(201)
    ).body as { id: string };
    const petr4 = await get<{ id: string }>('/assets/PETR4', user.bearer);
    const brokers = await get<{ id: string; name: string }[]>(
      '/brokers',
      user.bearer,
    );
    await http()
      .post(`/api/v1/portfolios/${portfolio.id}/operations`)
      .set('Authorization', user.bearer)
      .send({
        assetId: petr4.id,
        brokerId: brokers.find((broker) => broker.name === 'XP Investimentos')!
          .id,
        type: 'BUY',
        tradeDate: '2026-11-14',
        quantity: '10',
        unitPrice: '45.00',
        fees: '0',
      })
      .expect(201);

    const [line] = await get<PositionBody[]>(
      `/portfolios/${portfolio.id}/positions`,
      user.bearer,
    );
    expect(line.lastClose).toMatchObject({ value: '44.7', date: CLOSE_DATE });
    expect(cents(line.marketValue)).toBe('447.00');
    // The buy is after the close date: it does not enter the day change of 12/11 (no units then).
    expect(cents(line.dayChange)).toBe('0.00');
    expect(line.dayChangePercent).toBeNull();

    const performance = await get<ReturnsBody & { series: unknown[] }>(
      `/portfolios/${portfolio.id}/performance`,
      user.bearer,
    );
    expect(performance).toMatchObject({
      total: null,
      last12Months: null,
      last12MonthsUnavailableReason: 'SHORT_HISTORY',
      last12MonthsAvailableFrom: '2027-11-14',
      series: [],
    });
  });
});
