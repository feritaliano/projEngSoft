import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { Money } from '../src/shared/domain/money';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import {
  createBroker,
  createCryptoAsset,
  createFixedIncomeAsset,
  createIssuer,
} from './factories/catalog.factory';
import {
  bodyOf,
  createLongoPrazoCatalog,
  LONGO_PRAZO_OPERATIONS,
  LongoPrazoCatalog,
} from './factories/longo-prazo.factory';
import { createApiApp } from './utils/api-app';
import { truncateAllTables } from './utils/database';
import { signUp, TestSession } from './utils/session';

const PROBLEM_JSON = 'application/problem+json; charset=utf-8';

interface DerivedValueBody {
  value: string;
  formulaCode: string;
  asOf: string;
  inputs: {
    name: string;
    value: string;
    source: string;
    referenceDate: string;
    asset?: { ticker: string | null; status: string };
    operation?: { type: string; broker: { name: string } };
  }[];
}

interface PositionBody {
  asset: {
    id: string;
    ticker: string | null;
    displayName: string;
    assetType: string;
  };
  status: 'OPEN' | 'CLOSED';
  quantity: string;
  averagePrice: DerivedValueBody | null;
  totalCost: DerivedValueBody | null;
  realizedProfit: DerivedValueBody;
}

interface SummaryBody {
  totalCost: DerivedValueBody;
  realizedProfit: DerivedValueBody;
  assetCount: number;
}

const toCents = (value: string) => Money.of(value).toFixed(2);

describe('Positions and summary (E2E, B6, B7, D41, D55, RN05–RN12)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let ana: TestSession;
  let catalog: LongoPrazoCatalog;
  let portfolioId: string;
  const http = () => request(app.getHttpServer());

  async function enter(body: object): Promise<void> {
    await http()
      .post(`/api/v1/portfolios/${portfolioId}/operations`)
      .set('Authorization', ana.bearer)
      .send(body)
      .expect(201);
  }

  function petr4(
    type: 'BUY' | 'SELL',
    tradeDate: string,
    quantity: string,
    unitPrice: string,
    fees: string,
    broker = 'XP Investimentos',
  ) {
    return {
      assetId: catalog.assets.PETR4,
      brokerId: catalog.brokers[broker],
      type,
      tradeDate,
      quantity,
      unitPrice,
      fees,
    };
  }

  async function positions(session = ana): Promise<PositionBody[]> {
    const response = await http()
      .get(`/api/v1/portfolios/${portfolioId}/positions`)
      .set('Authorization', session.bearer)
      .expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    return response.body as PositionBody[];
  }

  async function summary(): Promise<SummaryBody> {
    const response = await http()
      .get(`/api/v1/portfolios/${portfolioId}/summary`)
      .set('Authorization', ana.bearer)
      .expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    return response.body as SummaryBody;
  }

  beforeAll(async () => {
    app = await createApiApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ana = await signUp(app, 'ana@example.com');
    catalog = await createLongoPrazoCatalog(prisma);
    const created = await http()
      .post('/api/v1/portfolios')
      .set('Authorization', ana.bearer)
      .send({ name: 'Longo prazo' })
      .expect(201);
    portfolioId = (created.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('buy → sell → position: PM kept by the sell, realized profit with its trace (RN05, RN06, D26)', async () => {
    await enter(petr4('BUY', '2026-01-05', '100', '29.95', '5.00'));
    await enter(petr4('SELL', '2026-06-02', '50', '38.00', '4.90'));

    const [line] = await positions();

    expect(line).toMatchObject({
      asset: { ticker: 'PETR4', displayName: 'PETR4', assetType: 'STOCK' },
      status: 'OPEN',
      quantity: '50',
      averagePrice: { value: '30', formulaCode: 'AVG_PRICE_BUY' },
      totalCost: { value: '1500', formulaCode: 'TOTAL_COST' },
      realizedProfit: {
        value: '395.1',
        formulaCode: 'POSITION_REALIZED_PROFIT',
      },
    });
    expect(line.realizedProfit.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(line.realizedProfit.inputs).toEqual([
      expect.objectContaining({
        name: 'sales',
        value: '395.1',
        source: 'OPERATION',
        referenceDate: '2026-06-02',
      }),
    ]);
  });

  it('shows a fully sold asset as CLOSED with its realized profit and no PM nor cost (D41, RN08)', async () => {
    await enter(petr4('BUY', '2026-01-05', '40', '36.00', '4.90'));
    await enter(petr4('SELL', '2026-02-10', '40', '46.55', '4.30'));

    expect(await positions()).toEqual([
      expect.objectContaining({
        status: 'CLOSED',
        quantity: '0',
        averagePrice: null,
        totalCost: null,
        realizedProfit: expect.objectContaining({ value: '412.8' }) as unknown,
      }),
    ]);
    expect(await summary()).toMatchObject({
      assetCount: 0,
      totalCost: { value: '0', inputs: [] },
      realizedProfit: { value: '412.8' },
    });
  });

  it('leaves out a closed position with realized profit exactly 0, in the table and in the totals (D41)', async () => {
    await enter(petr4('BUY', '2026-01-05', '10', '30.00', '0'));
    await enter(petr4('SELL', '2026-02-10', '10', '30.00', '0'));

    expect(await positions()).toEqual([]);
    expect(await summary()).toEqual({
      totalCost: expect.objectContaining({ value: '0', inputs: [] }) as unknown,
      realizedProfit: expect.objectContaining({
        value: '0',
        inputs: [],
      }) as unknown,
      assetCount: 0,
    });
  });

  it('sums the brokers of the portfolio in one position (RN12)', async () => {
    await enter(petr4('BUY', '2026-01-05', '100', '10', '0'));
    await enter(petr4('BUY', '2026-01-06', '100', '20', '0', 'Rico'));

    const lines = await positions();

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      quantity: '200',
      averagePrice: { value: '15' },
    });
    expect(lines[0].averagePrice?.inputs[2]).toMatchObject({
      name: 'quantityBought',
      operation: { type: 'BUY', broker: { name: 'Rico' } },
    });
  });

  it('totals the massa of the frames and matches the sum of the rows (D41)', async () => {
    for (const operation of LONGO_PRAZO_OPERATIONS) {
      await enter(bodyOf(catalog, operation));
    }

    const lines = await positions();
    const totals = await summary();

    expect(
      lines.map((line) => [line.asset.ticker, line.status, line.quantity]),
    ).toEqual([
      ['ITSA4', 'OPEN', '300'],
      ['PETR4', 'OPEN', '100'],
      ['WEGE3', 'CLOSED', '0'],
      ['MXRF11', 'OPEN', '150'],
      ['BOVA11', 'OPEN', '20'],
    ]);
    expect(toCents(totals.totalCost.value)).toBe('10051.27');
    expect(toCents(totals.realizedProfit.value)).toBe('693.87');
    expect(totals.assetCount).toBe(4);
    const sumOfRows = lines.reduce(
      (sum, line) => sum.plus(Money.of(line.realizedProfit.value)),
      Money.zero(),
    );
    expect(totals.realizedProfit.value).toBe(sumOfRows.toString());
    expect(
      totals.realizedProfit.inputs.map((input) => [
        input.name,
        input.source,
        input.asset?.ticker,
        input.asset?.status,
      ]),
    ).toEqual([
      ['positions', 'ASSET_POSITION', 'PETR4', 'OPEN'],
      ['positions', 'ASSET_POSITION', 'WEGE3', 'CLOSED'],
      ['positions', 'ASSET_POSITION', 'MXRF11', 'OPEN'],
    ]);
  });

  it('lists fixed income and crypto by display name and asset class, quantities as decimal strings (D55)', async () => {
    const btc = await createCryptoAsset(prisma, {
      ticker: 'BTC',
      name: 'Bitcoin',
    });
    const government = await createIssuer(prisma, { kind: 'GOVERNMENT' });
    const bond = await createFixedIncomeAsset(prisma, {
      issuerId: government.id,
      typeName: 'Tesouro IPCA+',
      maturityDate: '2035-05-15',
    });
    const exchange = await createBroker(prisma, {
      name: 'Binance',
      cnpj: null,
    });
    await enter(petr4('BUY', '2026-01-05', '10', '30', '0'));
    await enter({
      ...petr4('BUY', '2026-01-06', '0.00000001', '350000', '0'),
      assetId: btc.id,
      brokerId: exchange.id,
    });
    await enter({
      ...petr4('BUY', '2026-01-07', '0.52', '3000.10', '0'),
      assetId: bond.id,
    });

    const lines = await positions();

    expect(
      lines.map((line) => [
        line.asset.assetType,
        line.asset.ticker,
        line.asset.displayName,
        line.quantity,
      ]),
    ).toEqual([
      ['STOCK', 'PETR4', 'PETR4', '10'],
      ['FIXED_INCOME', null, 'Tesouro IPCA+ 2035', '0.52'],
      ['CRYPTO', 'BTC', 'Bitcoin', '0.00000001'],
    ]);
    expect(lines[1].totalCost?.value).toBe('1560.052');
    expect(lines[2].totalCost?.value).toBe('0.0035');
    expect((await summary()).assetCount).toBe(3);
  });

  it('answers 404 for a portfolio of another user, on positions and summary (RN02)', async () => {
    await enter(petr4('BUY', '2026-01-05', '10', '30', '0'));
    const bruno = await signUp(app, 'bruno@example.com', 'Bruno Lima');

    for (const path of ['positions', 'summary']) {
      const response = await http()
        .get(`/api/v1/portfolios/${portfolioId}/${path}`)
        .set('Authorization', bruno.bearer)
        .expect(404);
      expect(response.headers['content-type']).toBe(PROBLEM_JSON);
    }
  });
});
