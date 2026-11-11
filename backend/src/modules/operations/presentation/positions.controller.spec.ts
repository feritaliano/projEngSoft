import { APP_GUARD } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { configureApiApp } from '../../../configure-api-app';
import { ApiFastifyAdapter } from '../../../shared/presentation/api-fastify-adapter';
import { AccessTokens } from '../../auth/domain/session';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { PortfolioNotFoundError } from '../../portfolios/domain/portfolio';
import { GetPortfolioSummary } from '../application/get-portfolio-summary.use-case';
import { ListPositions } from '../application/list-positions.use-case';
import { PositionsController } from './positions.controller';

const PROBLEM_JSON = 'application/problem+json; charset=utf-8';
const P1 = '3f1c2b9e-8d4a-4c6f-9b1e-2a7d5c8e0f13';
const AUTH = { authorization: 'Bearer valid' };
const ZERO = {
  value: '0',
  formulaCode: 'PORTFOLIO_TOTAL_COST',
  asOf: '2026-11-11',
  inputs: [],
};

describe('PositionsController (B6, B7, D41)', () => {
  let app: NestFastifyApplication;
  const useCases = {
    positions: { execute: jest.fn() },
    summary: { execute: jest.fn() },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PositionsController],
      providers: [
        { provide: ListPositions, useValue: useCases.positions },
        { provide: GetPortfolioSummary, useValue: useCases.summary },
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

  const get = (path: string, headers: Record<string, string> = AUTH) =>
    app.inject({
      method: 'GET',
      url: `/api/v1/portfolios/${P1}/${path}`,
      headers,
    });

  it.each([
    ['positions', useCases.positions, []],
    [
      'summary',
      useCases.summary,
      { totalCost: ZERO, realizedProfit: ZERO, assetCount: 0 },
    ],
  ])(
    'answers %s for the authenticated user, never cached',
    async (path, useCase, body) => {
      useCase.execute.mockResolvedValue(body);

      const response = await get(path);

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(body);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(useCase.execute).toHaveBeenCalledWith('user-1', P1);
    },
  );

  it.each([
    ['positions', useCases.positions],
    ['summary', useCases.summary],
  ])(
    'answers 404 problem+json on %s for a portfolio of another user (RN02)',
    async (path, useCase) => {
      useCase.execute.mockRejectedValue(new PortfolioNotFoundError());

      const response = await get(path);

      expect(response.statusCode).toBe(404);
      expect(response.headers['content-type']).toBe(PROBLEM_JSON);
    },
  );

  it('answers 500 without details for an unexpected error, never an empty list', async () => {
    useCases.positions.execute.mockRejectedValue(new Error('broken timeline'));

    const response = await get('positions');

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('broken timeline');
  });

  it('requires authentication (401)', async () => {
    const response = await get('summary', {});

    expect(response.statusCode).toBe(401);
    expect(useCases.summary.execute).not.toHaveBeenCalled();
  });
});
