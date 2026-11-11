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
  createSector,
} from './factories/catalog.factory';
import { createApiApp } from './utils/api-app';
import { truncateAllTables } from './utils/database';
import { signUp } from './utils/session';

interface AssetPage {
  items: { ticker: string | null; displayName: string }[];
  total: number;
}

describe('Reference data (E2E, C1, RN03, RN04)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let bearer: string;

  const get = (url: string) =>
    request(app.getHttpServer()).get(url).set('Authorization', bearer);

  beforeAll(async () => {
    // One sign-up per test from the same IP; the rate limit has its own suite (auth).
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
    ({ bearer } = await signUp(app, 'ana@example.com'));

    const financeiro = await createSector(prisma, 'Financeiro');
    const itausa = await createIssuer(prisma, {
      name: 'Itaúsa S.A.',
      sectorId: financeiro.id,
    });
    const petrobras = await createIssuer(prisma, {
      name: 'Petróleo Brasileiro S.A. - Petrobras',
    });
    const tesouro = await createIssuer(prisma, {
      name: 'Tesouro Nacional',
      kind: 'GOVERNMENT',
    });
    await createListedAsset(prisma, { ticker: 'ITSA4', issuerId: itausa.id });
    await createListedAsset(prisma, { ticker: 'ITSA3', issuerId: itausa.id });
    await createListedAsset(prisma, {
      ticker: 'PETR4',
      issuerId: petrobras.id,
    });
    await createListedAsset(prisma, {
      ticker: 'PETR3',
      issuerId: petrobras.id,
      isActive: false,
    });
    await createCryptoAsset(prisma, { ticker: 'BTC', name: 'Bitcoin' });
    await createFixedIncomeAsset(prisma, {
      issuerId: tesouro.id,
      typeName: 'Tesouro IPCA+',
      maturityDate: '2035-05-15',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists the active catalog by ticker, fixed income last, with display name, issuer and sector (D50)', async () => {
    const response = await get('/api/v1/assets').expect(200);

    expect(response.body).toEqual({
      total: 5,
      items: [
        {
          id: expect.any(String) as unknown,
          ticker: 'BTC',
          assetType: 'CRYPTO',
          displayName: 'Bitcoin',
          issuer: null,
          sector: null,
        },
        expect.objectContaining({ ticker: 'ITSA3' }) as unknown,
        {
          id: expect.any(String) as unknown,
          ticker: 'ITSA4',
          assetType: 'STOCK',
          displayName: 'ITSA4',
          issuer: 'Itaúsa S.A.',
          sector: 'Financeiro',
        },
        expect.objectContaining({ ticker: 'PETR4', sector: null }) as unknown,
        {
          id: expect.any(String) as unknown,
          ticker: null,
          assetType: 'FIXED_INCOME',
          displayName: 'Tesouro IPCA+ 2035',
          issuer: 'Tesouro Nacional',
          sector: null,
        },
      ],
    });
  });

  it('searches by ticker ignoring case (C1)', async () => {
    const response = await get('/api/v1/assets?search=petr').expect(200);

    expect((response.body as AssetPage).items.map((a) => a.ticker)).toEqual([
      'PETR4',
    ]);
  });

  it('searches by issuer name ignoring case and accents (C1, unaccent)', async () => {
    for (const search of [
      'itausa',
      'ITAÚSA',
      'petróleo brasileiro',
      'petroleo',
    ]) {
      const response = await get(
        `/api/v1/assets?search=${encodeURIComponent(search)}`,
      ).expect(200);
      expect((response.body as AssetPage).total).toBeGreaterThan(0);
    }
    const itausa = await get('/api/v1/assets?search=itausa').expect(200);
    expect((itausa.body as AssetPage).items.map((a) => a.ticker)).toEqual([
      'ITSA3',
      'ITSA4',
    ]);
  });

  it('finds fixed income, which has no ticker, by the issuer name (D50)', async () => {
    const response = await get('/api/v1/assets?search=tesouro').expect(200);

    expect((response.body as AssetPage).items).toEqual([
      expect.objectContaining({
        ticker: null,
        displayName: 'Tesouro IPCA+ 2035',
      }),
    ]);
  });

  it('paginates with items and total (pageSize, page)', async () => {
    const first = await get('/api/v1/assets?pageSize=2').expect(200);
    const third = await get('/api/v1/assets?pageSize=2&page=3').expect(200);
    const beyond = await get('/api/v1/assets?pageSize=2&page=4').expect(200);

    expect((first.body as AssetPage).items.map((a) => a.ticker)).toEqual([
      'BTC',
      'ITSA3',
    ]);
    expect((third.body as AssetPage).items.map((a) => a.ticker)).toEqual([
      null,
    ]);
    expect(beyond.body).toEqual({ items: [], total: 5 });
  });

  it('treats LIKE wildcards in the search as plain text', async () => {
    const response = await get('/api/v1/assets?search=%25').expect(200);

    expect(response.body).toEqual({ items: [], total: 0 });
  });

  it('answers a NUL character with 400 in the search and 404 as ticker, never a database 500', async () => {
    const search = await get('/api/v1/assets?search=itsa%00').expect(400);
    expect(search.body.errors).toEqual([
      {
        field: 'search',
        code: 'INVALID_VALUE',
        message: expect.any(String) as unknown,
      },
    ]);

    await get('/api/v1/assets/PETR%00').expect(404);
  });

  it('rejects a pageSize above 100 with 400 naming the parameter', async () => {
    const response = await get('/api/v1/assets?pageSize=101').expect(400);

    expect(response.body.errors).toEqual([
      {
        field: 'pageSize',
        code: 'TOO_LARGE',
        params: { max: 100 },
        message: expect.any(String) as unknown,
      },
    ]);
  });

  it('gets an asset by ticker in any casing; inactive or unknown is 404', async () => {
    const found = await get('/api/v1/assets/itsa4').expect(200);
    expect(found.body).toMatchObject({
      ticker: 'ITSA4',
      issuer: 'Itaúsa S.A.',
    });

    for (const ticker of ['PETR3', 'XXXX3']) {
      const missing = await get(`/api/v1/assets/${ticker}`).expect(404);
      expect(missing.headers['content-type']).toBe(
        'application/problem+json; charset=utf-8',
      );
    }
  });

  it('lists the brokers by name, CNPJ null for an exchange (RN04, D50)', async () => {
    await createBroker(prisma, {
      name: 'XP Investimentos',
      cnpj: '02332886000104',
    });
    await createBroker(prisma, { name: 'Binance' });

    const response = await get('/api/v1/brokers').expect(200);

    expect(response.body).toEqual([
      { id: expect.any(String) as unknown, name: 'Binance', cnpj: null },
      {
        id: expect.any(String) as unknown,
        name: 'XP Investimentos',
        cnpj: '02332886000104',
      },
    ]);
  });

  it.each(['/api/v1/assets', '/api/v1/assets/ITSA4', '/api/v1/brokers'])(
    'GET %s without a token answers 401',
    async (url) => {
      await request(app.getHttpServer()).get(url).expect(401);
    },
  );
});
