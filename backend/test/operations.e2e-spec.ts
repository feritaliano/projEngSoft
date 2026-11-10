import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { getOptionsToken } from '@nestjs/throttler';
import request from 'supertest';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import {
  createBroker,
  createCryptoAsset,
  createFixedIncomeAsset,
  createIssuer,
  createListedAsset,
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
const MISSING_UUID = '00000000-0000-4000-8000-000000000000';

interface OperationBody {
  id: string;
  type: string;
  tradeDate: string;
  quantity: string;
  unitPrice: string;
  fees: string;
  asset: {
    id: string;
    ticker: string | null;
    displayName: string;
    assetType: string;
  };
  broker: { id: string; name: string };
}

describe('Operations (E2E, B2–B5, RN04–RN10, RN12)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let ana: TestSession;
  let catalog: LongoPrazoCatalog;
  let portfolioId: string;
  const http = () => request(app.getHttpServer());

  const base = () => `/api/v1/portfolios/${portfolioId}/operations`;

  function post(body: object, session = ana, path = base()) {
    return http().post(path).set('Authorization', session.bearer).send(body);
  }

  function buyPetr4(overrides: object = {}) {
    return {
      assetId: catalog.assets.PETR4,
      brokerId: catalog.brokers['XP Investimentos'],
      type: 'BUY',
      tradeDate: '2026-01-05',
      quantity: '100',
      unitPrice: '29.95',
      fees: '5.00',
      ...overrides,
    };
  }

  async function enter(body: object): Promise<OperationBody> {
    const response = await post(body).expect(201);
    return response.body as OperationBody;
  }

  async function portfolio() {
    const response = await http()
      .get(`/api/v1/portfolios/${portfolioId}`)
      .set('Authorization', ana.bearer)
      .expect(200);
    return response.body as {
      operationCount: number;
      assetCount: number;
      lastTradeDate: string | null;
    };
  }

  async function operationCount(): Promise<number> {
    return prisma.operation.count({ where: { portfolioId } });
  }

  beforeAll(async () => {
    app = await createApiApp({
      override: (builder) =>
        builder
          .overrideProvider(getOptionsToken())
          .useValue([{ ttl: 60_000, limit: 10_000 }]),
    });
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

  it('enters an operation (201) and reads it back for the edit form (B2, D41)', async () => {
    const response = await post(buyPetr4()).expect(201);

    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({
      id: expect.any(String) as unknown,
      type: 'BUY',
      tradeDate: '2026-01-05',
      quantity: '100',
      unitPrice: '29.95',
      fees: '5',
      asset: {
        id: catalog.assets.PETR4,
        ticker: 'PETR4',
        displayName: 'PETR4',
        assetType: 'STOCK',
      },
      broker: {
        id: catalog.brokers['XP Investimentos'],
        name: 'XP Investimentos',
      },
    });

    const read = await http()
      .get(`${base()}/${(response.body as OperationBody).id}`)
      .set('Authorization', ana.bearer)
      .expect(200);
    expect(read.body).toEqual(response.body);
    expect(read.headers['cache-control']).toBe('no-store');
  });

  it('enters the 9 operations of the handoff and lists them most recent first, 50 per page (B5, frame 6)', async () => {
    for (const operation of LONGO_PRAZO_OPERATIONS) {
      await enter(bodyOf(catalog, operation));
    }

    const history = await http()
      .get(base())
      .set('Authorization', ana.bearer)
      .expect(200);
    const body = history.body as { items: OperationBody[]; total: number };

    expect(body.total).toBe(9);
    expect(
      body.items.map(
        (item) => `${item.tradeDate} ${item.type} ${item.asset.ticker}`,
      ),
    ).toEqual([
      '2026-10-28 BUY BOVA11',
      '2026-06-02 SELL PETR4',
      '2026-05-22 SELL MXRF11',
      '2026-03-14 BUY PETR4',
      '2026-02-10 SELL WEGE3',
      '2026-01-20 BUY ITSA4',
      '2026-01-08 BUY MXRF11',
      // Same date: the one entered last comes first.
      '2026-01-05 BUY PETR4',
      '2026-01-05 BUY WEGE3',
    ]);
    expect(history.headers['cache-control']).toBe('no-store');
    expect(await portfolio()).toMatchObject({
      operationCount: 9,
      assetCount: 4,
      lastTradeDate: '2026-10-28',
    });
  });

  it('filters the history in the query, on every page (D45)', async () => {
    for (const operation of LONGO_PRAZO_OPERATIONS) {
      await enter(bodyOf(catalog, operation));
    }
    const list = async (query: string) =>
      (
        await http()
          .get(`${base()}?${query}`)
          .set('Authorization', ana.bearer)
          .expect(200)
      ).body as { items: OperationBody[]; total: number };

    const fiis = await list('assetType=FII');
    expect(fiis.total).toBe(2);
    expect(fiis.items.every((item) => item.asset.assetType === 'FII')).toBe(
      true,
    );

    const petr4 = await list(
      `assetId=${catalog.assets.PETR4}&pageSize=2&page=2`,
    );
    expect(petr4.total).toBe(3);
    expect(petr4.items.map((item) => item.tradeDate)).toEqual(['2026-01-05']);

    const rico = await list(`brokerId=${catalog.brokers.Rico}`);
    expect(rico.items.map((item) => item.asset.ticker)).toEqual([
      'BOVA11',
      'ITSA4',
    ]);

    expect((await list('assetType=CRYPTO')).total).toBe(0);
  });

  it.each([
    ['assetType', 'assetType=BOND'],
    ['assetId', 'assetId=abc'],
    ['pageSize', 'pageSize=101'],
  ])(
    'rejects an invalid filter %s with its field (400)',
    async (field, query) => {
      const response = await http()
        .get(`${base()}?${query}`)
        .set('Authorization', ana.bearer)
        .expect(400);

      expect(response.headers['content-type']).toBe(PROBLEM_JSON);
      expect(
        (response.body as { errors: { field: string }[] }).errors[0].field,
      ).toBe(field);
    },
  );

  it('rejects a sell above the position (RN07) with the offending operation, and saves nothing', async () => {
    await enter(buyPetr4());

    const response = await post(
      buyPetr4({
        type: 'SELL',
        tradeDate: '2026-10-28',
        quantity: '150',
        unitPrice: '38.50',
      }),
    ).expect(422);

    expect(response.headers['content-type']).toBe(PROBLEM_JSON);
    expect(response.body).toMatchObject({
      status: 422,
      violation: {
        rule: 'RN07',
        operation: {
          id: null,
          type: 'SELL',
          tradeDate: '2026-10-28',
          quantity: '150',
          asset: {
            id: catalog.assets.PETR4,
            ticker: 'PETR4',
            displayName: 'PETR4',
            assetType: 'STOCK',
          },
          broker: { name: 'XP Investimentos' },
        },
        availableQuantity: '100',
        soldQuantity: '150',
      },
    });
    expect(await operationCount()).toBe(1);
  });

  it('rejects an edit that leaves a later sell without units (RN10), naming the later sell, and changes nothing', async () => {
    const mxrfBuy = await enter(bodyOf(catalog, LONGO_PRAZO_OPERATIONS[2]));
    const mxrfSell = await enter(bodyOf(catalog, LONGO_PRAZO_OPERATIONS[6]));

    const response = await http()
      .patch(`${base()}/${mxrfBuy.id}`)
      .set('Authorization', ana.bearer)
      .send({ quantity: '40' })
      .expect(422);

    expect(response.body).toMatchObject({
      violation: {
        rule: 'RN10',
        operation: {
          id: mxrfSell.id,
          tradeDate: '2026-05-22',
          quantity: '50',
          asset: { ticker: 'MXRF11' },
          broker: { name: 'NuInvest' },
        },
        availableQuantity: '40',
        soldQuantity: '50',
      },
    });
    const unchanged = await http()
      .get(`${base()}/${mxrfBuy.id}`)
      .set('Authorization', ana.bearer)
      .expect(200);
    expect((unchanged.body as OperationBody).quantity).toBe('200');
  });

  it('rejects deleting a buy that a later sell needs (RN10, frame 6)', async () => {
    const buy = await enter(buyPetr4());
    const sell = await enter(
      buyPetr4({
        type: 'SELL',
        tradeDate: '2026-06-02',
        quantity: '50',
        unitPrice: '38',
      }),
    );

    const response = await http()
      .delete(`${base()}/${buy.id}`)
      .set('Authorization', ana.bearer)
      .expect(422);

    expect(response.body).toMatchObject({
      violation: {
        rule: 'RN10',
        operation: { id: sell.id },
        availableQuantity: '0',
        soldQuantity: '50',
      },
    });
    expect(await operationCount()).toBe(2);
  });

  it('rejects a retroactive sell that makes a later sell exceed the position (RN10)', async () => {
    await enter(buyPetr4());
    const later = await enter(
      buyPetr4({
        type: 'SELL',
        tradeDate: '2026-06-02',
        quantity: '50',
        unitPrice: '38',
      }),
    );

    const response = await post(
      buyPetr4({
        type: 'SELL',
        tradeDate: '2026-03-01',
        quantity: '60',
        unitPrice: '33',
      }),
    ).expect(422);

    expect(response.body).toMatchObject({
      violation: {
        rule: 'RN10',
        operation: { id: later.id },
        availableQuantity: '40',
      },
    });
  });

  it('edits only the fields sent, keeps the entry order and recalculates (B4)', async () => {
    const buy = await enter(buyPetr4());

    const response = await http()
      .patch(`${base()}/${buy.id}`)
      .set('Authorization', ana.bearer)
      .send({ fees: '0', brokerId: catalog.brokers.Rico })
      .expect(200);

    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toMatchObject({
      id: buy.id,
      quantity: '100',
      unitPrice: '29.95',
      fees: '0',
      broker: { name: 'Rico' },
    });
  });

  it('moves an operation to another asset validating both timelines (RN10)', async () => {
    const buy = await enter(buyPetr4());
    await enter(
      buyPetr4({
        type: 'SELL',
        tradeDate: '2026-06-02',
        quantity: '50',
        unitPrice: '38',
      }),
    );

    const rejected = await http()
      .patch(`${base()}/${buy.id}`)
      .set('Authorization', ana.bearer)
      .send({ assetId: catalog.assets.ITSA4 })
      .expect(422);
    expect(rejected.body).toMatchObject({
      violation: { rule: 'RN10', operation: { asset: { ticker: 'PETR4' } } },
    });

    const other = await enter(
      buyPetr4({ tradeDate: '2026-02-01', quantity: '10' }),
    );
    const moved = await http()
      .patch(`${base()}/${other.id}`)
      .set('Authorization', ana.bearer)
      .send({ assetId: catalog.assets.ITSA4 })
      .expect(200);
    expect((moved.body as OperationBody).asset.ticker).toBe('ITSA4');
    expect(await portfolio()).toMatchObject({ assetCount: 2 });
  });

  it('deletes an operation (204) and the counts of the portfolio follow (K3, D41)', async () => {
    const first = await enter(buyPetr4());
    await enter(
      buyPetr4({ tradeDate: '2026-03-14', quantity: '50', unitPrice: '36' }),
    );
    const sell = await enter(
      buyPetr4({
        type: 'SELL',
        tradeDate: '2026-06-02',
        quantity: '150',
        unitPrice: '38',
      }),
    );
    expect(await portfolio()).toMatchObject({
      operationCount: 3,
      assetCount: 0,
      lastTradeDate: '2026-06-02',
    });

    await http()
      .delete(`${base()}/${sell.id}`)
      .set('Authorization', ana.bearer)
      .expect(204);
    expect(await portfolio()).toMatchObject({
      operationCount: 2,
      assetCount: 1,
      lastTradeDate: '2026-03-14',
    });

    await http()
      .delete(`${base()}/${first.id}`)
      .set('Authorization', ana.bearer)
      .expect(204);
    await http()
      .get(`${base()}/${first.id}`)
      .set('Authorization', ana.bearer)
      .expect(404);
    expect(await portfolio()).toMatchObject({
      operationCount: 1,
      assetCount: 1,
    });
  });

  it('serializes two concurrent sells of the same asset: one is saved, the other is RN07 (lock per portfolio and asset)', async () => {
    await enter(buyPetr4());
    const sell = buyPetr4({
      type: 'SELL',
      tradeDate: '2026-06-02',
      quantity: '60',
      unitPrice: '38',
    });

    const responses = await Promise.all([post(sell), post(sell)]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 422,
    ]);
    expect(await operationCount()).toBe(2);
  });

  it('lets exactly as many concurrent sells in as the position holds (RN07 under load)', async () => {
    await enter(buyPetr4());
    const sell = buyPetr4({
      type: 'SELL',
      tradeDate: '2026-06-02',
      quantity: '30',
      unitPrice: '38',
    });

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => post(sell)),
    );

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([201, 201, 201, 422, 422]);
    expect(await operationCount()).toBe(4);
  });

  it('accepts fractional quantities of crypto (8 places) and fixed income (0.01), D44', async () => {
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

    const crypto = await enter({
      ...buyPetr4({ assetId: btc.id, brokerId: exchange.id }),
      quantity: '0.00000001',
      unitPrice: '328000.12345678',
    });
    expect(crypto).toMatchObject({
      quantity: '0.00000001',
      unitPrice: '328000.12345678',
      asset: { ticker: 'BTC', displayName: 'Bitcoin', assetType: 'CRYPTO' },
    });

    const fixed = await enter({
      ...buyPetr4({ assetId: bond.id }),
      quantity: '0.52',
      unitPrice: '3846.15',
    });
    expect(fixed.asset).toEqual({
      id: bond.id,
      ticker: null,
      displayName: 'Tesouro IPCA+ 2035',
      assetType: 'FIXED_INCOME',
    });
  });

  it.each([
    ['tradeDate', { tradeDate: '2999-01-01' }],
    ['tradeDate', { tradeDate: '05/01/2026' }],
    ['quantity', { quantity: '10.5' }],
    ['quantity', { quantity: '0' }],
    ['quantity', { quantity: '1e3' }],
    ['unitPrice', { unitPrice: '1.123456789' }],
    ['fees', { fees: '4.905' }],
    ['quantity', { quantity: '1000000000000' }],
    ['type', { type: 'GIFT' }],
    ['assetId', { assetId: MISSING_UUID }],
    ['assetId', { assetId: 'abc' }],
    ['brokerId', { brokerId: MISSING_UUID }],
    ['unexpected', { unexpected: 'x' }],
  ])(
    'rejects an invalid %s with its field (400, RN04)',
    async (field, overrides) => {
      const response = await post(buyPetr4(overrides)).expect(400);

      expect(response.headers['content-type']).toBe(PROBLEM_JSON);
      expect(
        (response.body as { errors: { field: string }[] }).errors.map(
          (error) => error.field,
        ),
      ).toContain(field);
      expect(await operationCount()).toBe(0);
    },
  );

  it('rejects an inactive asset (400 on assetId)', async () => {
    const company = await createIssuer(prisma);
    const inactive = await createListedAsset(prisma, {
      ticker: 'OIBR3',
      issuerId: company.id,
      isActive: false,
    });

    const response = await post(buyPetr4({ assetId: inactive.id })).expect(400);

    expect(response.body).toMatchObject({ errors: [{ field: 'assetId' }] });
  });

  it('answers 404 for a portfolio of another user, a missing one and malformed ids (RN02)', async () => {
    const buy = await enter(buyPetr4());
    const bruno = await signUp(app, 'bruno@example.com', 'Bruno Lima');

    await post(buyPetr4(), bruno).expect(404);
    await http().get(base()).set('Authorization', bruno.bearer).expect(404);
    await http()
      .get(`${base()}/${buy.id}`)
      .set('Authorization', bruno.bearer)
      .expect(404);
    await http()
      .patch(`${base()}/${buy.id}`)
      .set('Authorization', bruno.bearer)
      .send({ fees: '0' })
      .expect(404);
    await http()
      .delete(`${base()}/${buy.id}`)
      .set('Authorization', bruno.bearer)
      .expect(404);
    await post(
      buyPetr4(),
      ana,
      `/api/v1/portfolios/${MISSING_UUID}/operations`,
    ).expect(404);
    await post(buyPetr4(), ana, '/api/v1/portfolios/abc/operations').expect(
      404,
    );
    await http()
      .get(`${base()}/abc`)
      .set('Authorization', ana.bearer)
      .expect(404);
    await http()
      .get(`${base()}/${MISSING_UUID}`)
      .set('Authorization', ana.bearer)
      .expect(404);
    expect(await operationCount()).toBe(1);
  });

  it('answers 404 for an operation of another portfolio of the same user', async () => {
    const buy = await enter(buyPetr4());
    const other = await http()
      .post('/api/v1/portfolios')
      .set('Authorization', ana.bearer)
      .send({ name: 'Renda' })
      .expect(201);

    await http()
      .get(
        `/api/v1/portfolios/${(other.body as { id: string }).id}/operations/${buy.id}`,
      )
      .set('Authorization', ana.bearer)
      .expect(404);
  });

  it('requires authentication (401)', async () => {
    await http().get(base()).expect(401);
    await http().post(base()).send(buyPetr4()).expect(401);
  });
});
