import { APP_GUARD } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { configureApiApp } from '../../../configure-api-app';
import { InvalidValueError } from '../../../shared/domain/domain-error';
import { Quantity } from '../../../shared/domain/quantity';
import { ApiFastifyAdapter } from '../../../shared/presentation/api-fastify-adapter';
import { AccessTokens } from '../../auth/domain/session';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { PortfolioNotFoundError } from '../../portfolios/domain/portfolio';
import { CreateOperation } from '../application/create-operation.use-case';
import { DeleteOperation } from '../application/delete-operation.use-case';
import { GetOperation } from '../application/get-operation.use-case';
import { ListOperations } from '../application/list-operations.use-case';
import {
  OperationRejectedError,
  RuleViolationView,
} from '../application/operation-details';
import { PreviewOperation } from '../application/preview-operation.use-case';
import { UpdateOperation } from '../application/update-operation.use-case';
import { OperationNotFoundError } from '../domain/operation';
import { InvalidQuantityError } from '../domain/quantity-rules';
import { sell } from '../../../../test/factories/timeline.factory';
import { NegativePositionError } from '../domain/position-calculator';
import type { SellOperation } from '../domain/timeline';
import { RuleViolationError } from '../domain/timeline-change';
import { OperationsController } from './operations.controller';

const PROBLEM_JSON = 'application/problem+json; charset=utf-8';
const P1 = '3f1c2b9e-8d4a-4c6f-9b1e-2a7d5c8e0f13';
const OP = '9a4e1c27-6d3b-4f80-b5a2-1e7c9d0f3b64';
const AUTH = { authorization: 'Bearer valid' };
const BASE = `/api/v1/portfolios/${P1}/operations`;

const ASSET = {
  id: '6b0d3a52-1f5e-4f0a-9d7c-3e2b8a1c4d90',
  ticker: 'PETR4',
  displayName: 'PETR4',
  assetType: 'STOCK',
};
const BROKER = {
  id: '0c9e7f3a-5b2d-4e81-a6c4-9d1f2b3e4a57',
  name: 'XP Investimentos',
};
const VIEW = {
  id: OP,
  type: 'BUY',
  tradeDate: '2026-01-05',
  quantity: '100',
  unitPrice: '29.95',
  fees: '5',
  asset: ASSET,
  broker: BROKER,
};
const BODY = {
  assetId: ASSET.id,
  brokerId: BROKER.id,
  type: 'BUY',
  tradeDate: '2026-01-05',
  quantity: '100',
  unitPrice: '29.95',
  fees: '5.00',
};
const VIOLATION: RuleViolationView = {
  rule: 'RN10',
  operation: {
    id: OP,
    type: 'SELL',
    tradeDate: '2026-05-22',
    quantity: '50',
    asset: ASSET as RuleViolationView['operation']['asset'],
    broker: BROKER,
  },
  availableQuantity: '40',
  soldQuantity: '50',
};

describe('OperationsController (B2–B5, RN04, RN07, RN10)', () => {
  let app: NestFastifyApplication;
  const useCases = {
    list: { execute: jest.fn() },
    get: { execute: jest.fn() },
    create: { execute: jest.fn() },
    update: { execute: jest.fn() },
    delete: { execute: jest.fn() },
    preview: { execute: jest.fn() },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OperationsController],
      providers: [
        { provide: ListOperations, useValue: useCases.list },
        { provide: GetOperation, useValue: useCases.get },
        { provide: CreateOperation, useValue: useCases.create },
        { provide: UpdateOperation, useValue: useCases.update },
        { provide: DeleteOperation, useValue: useCases.delete },
        { provide: PreviewOperation, useValue: useCases.preview },
        {
          provide: AccessTokens,
          useValue: {
            verify: (token: string) =>
              Promise.resolve(token === 'valid' ? 'user-1' : null),
          },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new ApiFastifyAdapter(),
      { logger: false },
    );
    await configureApiApp(app, {
      corsOrigin: 'http://localhost:4200',
      production: false,
    });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    Object.values(useCases).forEach((useCase) => useCase.execute.mockReset());
  });

  const inject = (
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    payload?: object,
  ) => app.inject({ method, url, headers: AUTH, ...(payload && { payload }) });

  it('creates an operation (201), never cached, with the authenticated user and the body', async () => {
    useCases.create.execute.mockResolvedValue(VIEW);

    const response = await inject('POST', BASE, BODY);

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(VIEW);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(useCases.create.execute).toHaveBeenCalledWith('user-1', P1, BODY);
  });

  it('previews with 200, never cached, splitting replacesOperationId from the operation (D42)', async () => {
    const preview = { positionBefore: '0', violation: VIOLATION };
    useCases.preview.execute.mockResolvedValue(preview);

    const created = await inject('POST', `${BASE}/preview`, BODY);
    const edited = await inject('POST', `${BASE}/preview`, {
      ...BODY,
      replacesOperationId: OP,
    });

    expect(created.statusCode).toBe(200);
    expect(created.headers['cache-control']).toBe('no-store');
    expect(created.json()).toEqual(preview);
    expect(useCases.preview.execute).toHaveBeenNthCalledWith(
      1,
      'user-1',
      P1,
      BODY,
      null,
    );
    expect(edited.statusCode).toBe(200);
    expect(useCases.preview.execute).toHaveBeenNthCalledWith(
      2,
      'user-1',
      P1,
      BODY,
      OP,
    );
  });

  it.each([
    ['replacesOperationId', { replacesOperationId: 'abc' }],
    ['quantity', { quantity: '1e3' }],
  ])(
    'rejects a malformed %s in the preview body before the use case (400, D56)',
    async (field, overrides) => {
      const response = await inject('POST', `${BASE}/preview`, {
        ...BODY,
        ...overrides,
      });

      expect(response.statusCode).toBe(400);
      expect(
        response.json<{ errors: { field: string; code: string }[] }>().errors,
      ).toContainEqual(expect.objectContaining({ field }));
      expect(useCases.preview.execute).not.toHaveBeenCalled();
    },
  );

  it('answers 400 on replacesOperationId when the replaced operation is not found (D56)', async () => {
    useCases.preview.execute.mockRejectedValue(
      new InvalidValueError(
        'replacesOperationId',
        'NOT_FOUND',
        'must be an operation of this portfolio',
      ),
    );

    const response = await inject('POST', `${BASE}/preview`, {
      ...BODY,
      replacesOperationId: OP,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      errors: [{ field: 'replacesOperationId', code: 'NOT_FOUND' }],
    });
  });

  it('answers 404 to a preview in a portfolio that is not the user’s (RN02)', async () => {
    useCases.preview.execute.mockRejectedValue(new PortfolioNotFoundError());

    const response = await inject('POST', `${BASE}/preview`, BODY);

    expect(response.statusCode).toBe(404);
  });

  it('lists with the defaults (page 1, 50 per page) and passes the filters', async () => {
    useCases.list.execute.mockResolvedValue({ items: [VIEW], total: 1 });

    const plain = await inject('GET', BASE);
    const filtered = await inject(
      'GET',
      `${BASE}?assetType=FII&brokerId=${BROKER.id}&page=2&pageSize=10`,
    );

    expect(plain.statusCode).toBe(200);
    expect(plain.headers['cache-control']).toBe('no-store');
    expect(useCases.list.execute).toHaveBeenNthCalledWith(1, 'user-1', P1, {
      assetId: null,
      brokerId: null,
      assetType: null,
      page: 1,
      pageSize: 50,
    });
    expect(filtered.statusCode).toBe(200);
    expect(useCases.list.execute).toHaveBeenNthCalledWith(2, 'user-1', P1, {
      assetId: null,
      brokerId: BROKER.id,
      assetType: 'FII',
      page: 2,
      pageSize: 10,
    });
  });

  it('gets, edits and deletes one operation', async () => {
    useCases.get.execute.mockResolvedValue(VIEW);
    useCases.update.execute.mockResolvedValue({ ...VIEW, fees: '0' });
    useCases.delete.execute.mockResolvedValue(undefined);

    expect((await inject('GET', `${BASE}/${OP}`)).json()).toEqual(VIEW);
    const patched = await inject('PATCH', `${BASE}/${OP}`, { fees: '0' });
    expect(patched.statusCode).toBe(200);
    expect(useCases.update.execute).toHaveBeenCalledWith('user-1', P1, OP, {
      fees: '0',
    });
    const deleted = await inject('DELETE', `${BASE}/${OP}`);
    expect(deleted.statusCode).toBe(204);
    expect(useCases.delete.execute).toHaveBeenCalledWith('user-1', P1, OP);
  });

  it('answers 422 in problem+json with the offending sell (RN10)', async () => {
    const cause = new RuleViolationError(
      'RN10',
      ASSET.id,
      sell('2026-05-22', '50', '9.88', '0.40', { id: OP }) as SellOperation,
      Quantity.of('40'),
      new NegativePositionError(
        sell('2026-05-22', '50', '9.88', '0.40', { id: OP }) as SellOperation,
        Quantity.of('40'),
      ),
    );
    useCases.delete.execute.mockRejectedValue(
      new OperationRejectedError(VIOLATION, cause),
    );

    const response = await inject('DELETE', `${BASE}/${OP}`);

    expect(response.statusCode).toBe(422);
    expect(response.headers['content-type']).toBe(PROBLEM_JSON);
    expect(response.json()).toMatchObject({
      status: 422,
      detail: expect.stringContaining('RN10') as unknown,
      violation: VIOLATION,
    });
  });

  it.each([
    ['portfolio', new PortfolioNotFoundError(), 'Portfolio not found.'],
    ['operation', new OperationNotFoundError(), 'Operation not found.'],
  ])(
    'answers 404 when the %s is not found (RN02)',
    async (_kind, error, detail) => {
      useCases.get.execute.mockRejectedValue(error);

      const response = await inject('GET', `${BASE}/${OP}`);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ detail });
    },
  );

  it('answers 400 with field, code and params for a domain rule (RN04, D56)', async () => {
    useCases.create.execute.mockRejectedValue(
      new InvalidValueError(
        'tradeDate',
        'FUTURE_DATE',
        'must not be after today',
        { today: '2026-11-09' },
      ),
    );

    const response = await inject('POST', BASE, BODY);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      errors: [
        {
          field: 'tradeDate',
          code: 'FUTURE_DATE',
          params: { today: '2026-11-09' },
        },
      ],
    });
  });

  it('answers 400 on quantity for the rule of the asset class (RN04, D50)', async () => {
    useCases.create.execute.mockRejectedValue(
      new InvalidQuantityError(
        'FIXED_INCOME',
        Quantity.of('0.525'),
        'INVALID_STEP',
        'must be a multiple of 0.01',
        { step: '0.01' },
      ),
    );

    const response = await inject('POST', BASE, BODY);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      errors: [
        { field: 'quantity', code: 'INVALID_STEP', params: { step: '0.01' } },
      ],
    });
  });

  it.each([
    ['quantity', { quantity: '1e3' }],
    ['quantity', { quantity: 100 }],
    ['tradeDate', { tradeDate: '05/01/2026' }],
    ['assetId', { assetId: 'abc' }],
    ['type', { type: 'GIFT' }],
    ['extra', { extra: 'x' }],
  ])(
    'rejects a malformed %s in the body before the use case (400)',
    async (field, overrides) => {
      const response = await inject('POST', BASE, { ...BODY, ...overrides });

      expect(response.statusCode).toBe(400);
      expect(
        response
          .json<{ errors: { field: string }[] }>()
          .errors.map((error) => error.field),
      ).toContain(field);
      expect(useCases.create.execute).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['assetType', 'assetType=BOND'],
    ['brokerId', 'brokerId=abc'],
    ['pageSize', 'pageSize=101'],
  ])('rejects an invalid %s in the query (400)', async (field, query) => {
    const response = await inject('GET', `${BASE}?${query}`);

    expect(response.statusCode).toBe(400);
    expect(
      response.json<{ errors: { field: string }[] }>().errors[0].field,
    ).toBe(field);
  });

  it('rejects a body that is not an object with 400, not 500 (D56)', async () => {
    const response = await inject('PATCH', `${BASE}/${OP}`, []);

    expect(response.statusCode).toBe(400);
    expect(response.json<{ errors: unknown[] }>().errors).toEqual([
      { field: 'body', code: 'REQUIRED', message: 'body is required' },
    ]);
    expect(useCases.update.execute).not.toHaveBeenCalled();
  });

  it('lets an unexpected error become a generic 500', async () => {
    useCases.get.execute.mockRejectedValue(new Error('database down'));

    const response = await inject('GET', `${BASE}/${OP}`);

    expect(response.statusCode).toBe(500);
    expect(JSON.stringify(response.json())).not.toContain('database down');
  });

  it.each([
    ['GET', BASE],
    ['POST', BASE],
    ['POST', `${BASE}/preview`],
    ['GET', `${BASE}/${OP}`],
    ['PATCH', `${BASE}/${OP}`],
    ['DELETE', `${BASE}/${OP}`],
  ] as const)('%s %s without a token answers 401', async (method, url) => {
    const response = await app.inject({ method, url, payload: {} });

    expect(response.statusCode).toBe(401);
  });
});
