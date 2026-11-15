import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import {
  bodyOf,
  createLongoPrazoCatalog,
  LONGO_PRAZO_OPERATIONS,
  LongoPrazoCatalog,
} from './factories/longo-prazo.factory';
import { createApiApp } from './utils/api-app';
import { truncateAllTables } from './utils/database';
import { signUp, TestSession } from './utils/session';

const MISSING_UUID = '00000000-0000-4000-8000-000000000000';

interface DerivedValueBody {
  value: string;
  formulaCode: string;
  inputs: { name: string; value: string; operation?: { id: string | null } }[];
}

interface PreviewBody {
  grossAmount: DerivedValueBody;
  netAmount: DerivedValueBody;
  positionBefore: string | null;
  positionAfter: string | null;
  averagePriceBefore: DerivedValueBody | null;
  averagePriceAfter: DerivedValueBody | null;
  realizedProfit?: DerivedValueBody | null;
  violation?: unknown;
}

interface PositionBody {
  asset: { ticker: string | null };
  quantity: string;
  averagePrice: DerivedValueBody | null;
  realizedProfit: DerivedValueBody;
}

/** D42: the preview calculates as saving would and never writes, whatever the load. */
describe('Operation preview (E2E, D42, RN07, RN10)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let ana: TestSession;
  let catalog: LongoPrazoCatalog;
  let portfolioId: string;
  const http = () => request(app.getHttpServer());
  const base = () => `/api/v1/portfolios/${portfolioId}/operations`;

  function petr4(overrides: object = {}) {
    return {
      assetId: catalog.assets.PETR4,
      brokerId: catalog.brokers['XP Investimentos'],
      type: 'BUY',
      tradeDate: '2026-10-30',
      quantity: '50',
      unitPrice: '35.20',
      fees: '3.10',
      ...overrides,
    };
  }

  function preview(body: object, session = ana, path = `${base()}/preview`) {
    return http().post(path).set('Authorization', session.bearer).send(body);
  }

  async function previewOf(body: object): Promise<PreviewBody> {
    const response = await preview(body).expect(200);
    return response.body as PreviewBody;
  }

  async function petr4Position(): Promise<PositionBody> {
    const response = await http()
      .get(`/api/v1/portfolios/${portfolioId}/positions`)
      .set('Authorization', ana.bearer)
      .expect(200);
    const line = (response.body as PositionBody[]).find(
      (position) => position.asset.ticker === 'PETR4',
    );
    if (!line) {
      throw new Error('PETR4 position not found');
    }
    return line;
  }

  /** Every column of every operation, in a stable order. */
  function allOperations() {
    return prisma.operation.findMany({ orderBy: { id: 'asc' } });
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
    for (const operation of LONGO_PRAZO_OPERATIONS) {
      await http()
        .post(base())
        .set('Authorization', ana.bearer)
        .send(bodyOf(catalog, operation))
        .expect(201);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('gives the same position and PM after a buy as saving it does (D42)', async () => {
    const body = petr4();

    const result = await previewOf(body);
    await http()
      .post(base())
      .set('Authorization', ana.bearer)
      .send(body)
      .expect(201);
    const position = await petr4Position();

    expect(result).toMatchObject({
      grossAmount: { value: '1760', formulaCode: 'OPERATION_GROSS' },
      netAmount: { value: '1763.1', formulaCode: 'OPERATION_TOTAL_BUY' },
      positionBefore: '100',
    });
    expect(result.positionAfter).toBe(position.quantity);
    // Same trace, except that the preview links to the buy before it has an id.
    const valuesOf = (derived: DerivedValueBody | null) =>
      derived && [derived.value, derived.inputs.map((input) => input.value)];
    expect(valuesOf(result.averagePriceAfter)).toEqual(
      valuesOf(position.averagePrice),
    );
    expect(result.averagePriceAfter?.inputs[2].operation?.id).toBeNull();
  });

  it('gives the same position, PM and realized profit after a sell as saving it does (D42, RN06)', async () => {
    const body = petr4({ type: 'SELL', quantity: '30', unitPrice: '41' });

    const result = await previewOf(body);
    const saved = await http()
      .post(base())
      .set('Authorization', ana.bearer)
      .send(body)
      .expect(201);
    const position = await petr4Position();

    expect(result.positionAfter).toBe(position.quantity);
    expect(result.averagePriceAfter?.value).toBe(position.averagePrice?.value);
    const sale = position.realizedProfit.inputs.find(
      (input) => input.operation?.id === (saved.body as { id: string }).id,
    );
    expect(result.realizedProfit?.value).toBe(sale?.value);
  });

  it('answers a sell above the position with 200 and the violation of the 422, saving nothing (RN07)', async () => {
    const body = petr4({ type: 'SELL', quantity: '150', unitPrice: '41' });
    const before = await allOperations();

    const result = await previewOf(body);
    const rejected = await http()
      .post(base())
      .set('Authorization', ana.bearer)
      .send(body)
      .expect(422);

    expect(result).toMatchObject({
      positionBefore: '100',
      positionAfter: null,
      averagePriceAfter: null,
      realizedProfit: null,
      violation: { rule: 'RN07', availableQuantity: '100' },
    });
    expect(result.violation).toEqual(
      (rejected.body as { violation: unknown }).violation,
    );
    expect(await allOperations()).toEqual(before);
  });

  it('previews an edit with replacesOperationId: a buy turned into a sell leaves a later sell above the position (RN10), nothing changes', async () => {
    const history = await http()
      .get(`${base()}?assetId=${catalog.assets.PETR4}`)
      .set('Authorization', ana.bearer)
      .expect(200);
    const items = (
      history.body as { items: { id: string; tradeDate: string }[] }
    ).items;
    const marchBuy = items.find((item) => item.tradeDate === '2026-03-14');
    const juneSell = items.find((item) => item.tradeDate === '2026-06-02');
    const before = await allOperations();

    const result = await previewOf({
      ...petr4({
        type: 'SELL',
        tradeDate: '2026-03-14',
        quantity: '60',
        unitPrice: '35',
      }),
      replacesOperationId: marchBuy?.id,
    });

    expect(result).toMatchObject({
      grossAmount: {
        inputs: [{ name: 'quantity', operation: { id: marchBuy?.id } }, {}],
      },
      positionBefore: '100',
      positionAfter: '40',
      violation: {
        rule: 'RN10',
        operation: { id: juneSell?.id },
        availableQuantity: '40',
        soldQuantity: '50',
      },
    });
    expect(await allOperations()).toEqual(before);
  });

  it('answers 40 concurrent previews with 200 and changes no row of operations (D42)', async () => {
    const stored = await allOperations();
    const bodies = [
      petr4(),
      petr4({ type: 'SELL', quantity: '30', unitPrice: '41' }),
      petr4({ type: 'SELL', quantity: '150', unitPrice: '41' }),
      { ...petr4({ quantity: '7' }), replacesOperationId: stored[0].id },
    ];

    const responses = await Promise.all(
      Array.from({ length: 40 }, (_, i) => preview(bodies[i % bodies.length])),
    );

    expect(responses.map((response) => response.status)).toEqual(
      Array.from({ length: 40 }, () => 200),
    );
    expect(await allOperations()).toEqual(stored);
  });

  it('validates the body as POST operations does (400 with field and code, D56)', async () => {
    const response = await preview(petr4({ tradeDate: '2999-01-01' })).expect(
      400,
    );

    expect(response.body).toMatchObject({
      errors: [{ field: 'tradeDate', code: 'FUTURE_DATE' }],
    });
  });

  it('answers 400 NOT_FOUND on replacesOperationId for an operation that does not exist (D56)', async () => {
    const response = await preview({
      ...petr4(),
      replacesOperationId: MISSING_UUID,
    }).expect(400);

    expect(response.body).toMatchObject({
      errors: [{ field: 'replacesOperationId', code: 'NOT_FOUND' }],
    });
  });

  it('answers 404 for a portfolio of another user and for a missing one (RN02)', async () => {
    const bruno = await signUp(app, 'bruno@example.com', 'Bruno Lima');

    await preview(petr4(), bruno).expect(404);
    await preview(
      petr4(),
      ana,
      `/api/v1/portfolios/${MISSING_UUID}/operations/preview`,
    ).expect(404);
  });
});
