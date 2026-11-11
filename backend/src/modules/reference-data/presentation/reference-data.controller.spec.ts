import { APP_GUARD } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { configureApiApp } from '../../../configure-api-app';
import { ApiFastifyAdapter } from '../../../shared/presentation/api-fastify-adapter';
import { AccessTokens } from '../../auth/domain/session';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { GetAsset } from '../application/get-asset.use-case';
import { ListBrokers } from '../application/list-brokers.use-case';
import { SearchAssets } from '../application/search-assets.use-case';
import { InvalidValueError } from '../../../shared/domain/domain-error';
import { AssetNotFoundError } from '../domain/catalog';
import {
  AssetsController,
  BrokersController,
} from './reference-data.controller';

const AUTH = { authorization: 'Bearer valid' };
const PAGE = { items: [], total: 0 };

describe('AssetsController and BrokersController (C1, RN04)', () => {
  let app: NestFastifyApplication;
  const useCases = {
    search: { execute: jest.fn() },
    get: { execute: jest.fn() },
    brokers: { execute: jest.fn() },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AssetsController, BrokersController],
      providers: [
        { provide: SearchAssets, useValue: useCases.search },
        { provide: GetAsset, useValue: useCases.get },
        { provide: ListBrokers, useValue: useCases.brokers },
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

  it('converts page and pageSize of the query string to numbers', async () => {
    useCases.search.execute.mockResolvedValue(PAGE);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/assets?search=itausa&page=2&pageSize=50',
      headers: AUTH,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(PAGE);
    expect(useCases.search.execute).toHaveBeenCalledWith({
      search: 'itausa',
      page: 2,
      pageSize: 50,
    });
  });

  it.each([
    ['pageSize above the documented limit', 'pageSize=101', 'pageSize'],
    ['page 0', 'page=0', 'page'],
    ['a non-numeric page', 'page=abc', 'page'],
    [
      'a search longer than 100 characters',
      `search=${'a'.repeat(101)}`,
      'search',
    ],
    ['an unknown parameter', 'sort=ticker', 'sort'],
  ])(
    'rejects %s with 400 naming the parameter',
    async (_case, query, field) => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/assets?${query}`,
        headers: AUTH,
      });

      expect(response.statusCode).toBe(400);
      const { errors } = response.json<{ errors: { field: string }[] }>();
      expect(errors.map((error) => error.field)).toContain(field);
      expect(useCases.search.execute).not.toHaveBeenCalled();
    },
  );

  it('maps a search rejected by the domain to 400 with errors[].field', async () => {
    useCases.search.execute.mockRejectedValue(
      new InvalidValueError('page', 'TOO_LARGE', 'must be at most 100000', {
        max: 100000,
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/assets',
      headers: AUTH,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ errors: unknown[] }>().errors).toEqual([
      {
        field: 'page',
        code: 'TOO_LARGE',
        message: 'page must be at most 100000',
        params: { max: 100000 },
      },
    ]);
  });

  it('answers 404 problem+json for an unknown ticker', async () => {
    useCases.get.execute.mockRejectedValue(new AssetNotFoundError());

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/assets/XXXX3',
      headers: AUTH,
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toContain(
      'application/problem+json',
    );
    expect(response.json()).toMatchObject({ detail: 'Asset not found.' });
  });

  it('lets any other error of the asset lookup become a generic 500', async () => {
    useCases.get.execute.mockRejectedValue(new Error('boom'));

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/assets/PETR4',
      headers: AUTH,
    });

    expect(response.statusCode).toBe(500);
  });

  it('lists the brokers', async () => {
    useCases.brokers.execute.mockResolvedValue([
      { id: 'b1', name: 'Binance', cnpj: null },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/brokers',
      headers: AUTH,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      { id: 'b1', name: 'Binance', cnpj: null },
    ]);
  });

  it.each(['/api/v1/assets', '/api/v1/assets/PETR4', '/api/v1/brokers'])(
    'GET %s without a token answers 401',
    async (url) => {
      const response = await app.inject({ method: 'GET', url });

      expect(response.statusCode).toBe(401);
    },
  );
});
