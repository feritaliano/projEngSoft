import { APP_GUARD } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { configureApiApp } from '../../../configure-api-app';
import { InvalidValueError } from '../../../shared/domain/domain-error';
import { ApiFastifyAdapter } from '../../../shared/presentation/api-fastify-adapter';
import { AccessTokens } from '../../auth/domain/session';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { CreatePortfolio } from '../application/create-portfolio.use-case';
import { DeletePortfolio } from '../application/delete-portfolio.use-case';
import { GetOwnedPortfolio } from '../application/get-owned-portfolio.use-case';
import { ListPortfolios } from '../application/list-portfolios.use-case';
import {
  PortfolioNameTakenError,
  PortfolioNotFoundError,
} from '../domain/portfolio';
import { PortfoliosController } from './portfolios.controller';

const PROBLEM_JSON = 'application/problem+json; charset=utf-8';
const ID = '3f1c2b9e-8d4a-4c6f-9b1e-2a7d5c8e0f13';
const SUMMARY = {
  id: ID,
  name: 'Longo prazo',
  operationCount: 11,
  assetCount: 6,
};
const AUTH = { authorization: 'Bearer valid' };

describe('PortfoliosController (B1, RN02, D41)', () => {
  let app: NestFastifyApplication;
  const useCases = {
    list: { execute: jest.fn() },
    get: { execute: jest.fn() },
    create: { execute: jest.fn() },
    delete: { execute: jest.fn() },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PortfoliosController],
      providers: [
        { provide: ListPortfolios, useValue: useCases.list },
        { provide: GetOwnedPortfolio, useValue: useCases.get },
        { provide: CreatePortfolio, useValue: useCases.create },
        { provide: DeletePortfolio, useValue: useCases.delete },
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

  it('lists the portfolios of the authenticated user, never cached', async () => {
    useCases.list.execute.mockResolvedValue([SUMMARY]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/portfolios',
      headers: AUTH,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([SUMMARY]);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(useCases.list.execute).toHaveBeenCalledWith('user-1');
  });

  it.each([
    ['GET', '/api/v1/portfolios'],
    ['GET', `/api/v1/portfolios/${ID}`],
    ['POST', '/api/v1/portfolios'],
    ['DELETE', `/api/v1/portfolios/${ID}`],
  ] as const)('%s %s without a token answers 401', async (method, url) => {
    const response = await app.inject({ method, url, payload: { name: 'x' } });

    expect(response.statusCode).toBe(401);
    expect(response.headers['content-type']).toBe(PROBLEM_JSON);
    Object.values(useCases).forEach((useCase) =>
      expect(useCase.execute).not.toHaveBeenCalled(),
    );
  });

  it('gets a portfolio of the user, passing the id of the token and of the path', async () => {
    useCases.get.execute.mockResolvedValue(SUMMARY);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/portfolios/${ID}`,
      headers: AUTH,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(useCases.get.execute).toHaveBeenCalledWith('user-1', ID);
  });

  it.each([
    ['GET', 'get'],
    ['DELETE', 'delete'],
  ] as const)(
    '%s of a missing or foreign portfolio answers 404 problem+json (RN02)',
    async (method, useCase) => {
      useCases[useCase].execute.mockRejectedValue(new PortfolioNotFoundError());

      const response = await app.inject({
        method,
        url: `/api/v1/portfolios/${ID}`,
        headers: AUTH,
      });

      expect(response.statusCode).toBe(404);
      expect(response.headers['content-type']).toBe(PROBLEM_JSON);
      expect(response.json()).toMatchObject({
        status: 404,
        detail: 'Portfolio not found.',
      });
    },
  );

  it('creates a portfolio: 201 with the summary', async () => {
    useCases.create.execute.mockResolvedValue({
      ...SUMMARY,
      operationCount: 0,
      assetCount: 0,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/portfolios',
      headers: AUTH,
      payload: { name: 'Longo prazo' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(useCases.create.execute).toHaveBeenCalledWith(
      'user-1',
      'Longo prazo',
    );
  });

  it('answers 409 with field "name" for a duplicated name (RN02)', async () => {
    useCases.create.execute.mockRejectedValue(new PortfolioNameTakenError());

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/portfolios',
      headers: AUTH,
      payload: { name: 'Longo prazo' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ status: 409, field: 'name' });
  });

  it('answers 400 with errors[].field "name" for a blank name (domain)', async () => {
    useCases.create.execute.mockRejectedValue(
      new InvalidValueError('name', 'REQUIRED', 'is required'),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/portfolios',
      headers: AUTH,
      payload: { name: '   ' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ errors: unknown[] }>().errors).toEqual([
      { field: 'name', code: 'REQUIRED', message: 'name is required' },
    ]);
  });

  it.each([
    ['a missing name', {}, 'name'],
    ['an extra field', { name: 'A', userId: 'other' }, 'userId'],
  ])('answers 400 for %s, naming the field', async (_case, payload, field) => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/portfolios',
      headers: AUTH,
      payload,
    });

    expect(response.statusCode).toBe(400);
    const { errors } = response.json<{ errors: { field: string }[] }>();
    expect(errors.map((error) => error.field)).toContain(field);
    expect(useCases.create.execute).not.toHaveBeenCalled();
  });

  it('deletes: 204 without body', async () => {
    useCases.delete.execute.mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/portfolios/${ID}`,
      headers: AUTH,
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(useCases.delete.execute).toHaveBeenCalledWith('user-1', ID);
  });

  it('lets an unexpected error become a generic 500', async () => {
    useCases.list.execute.mockRejectedValue(new Error('pool exhausted'));

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/portfolios',
      headers: AUTH,
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('pool');
  });
});
