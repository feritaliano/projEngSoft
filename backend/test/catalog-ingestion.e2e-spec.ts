import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { LoadCatalog } from '../src/modules/ingestion/application/load-catalog.use-case';
import { CatalogWriter } from '../src/modules/reference-data/domain/catalog-entry';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import {
  cotahistOf,
  COTAHIST_SAMPLE,
  INSTRUMENTS_SAMPLE,
  instrumentLine,
  instrumentsFile,
} from './factories/catalog-files.factory';
import { createIssuer } from './factories/catalog.factory';
import { createApiApp } from './utils/api-app';
import { truncateAllTables } from './utils/database';
import { signUp } from './utils/session';
import { runSqlFile } from './utils/sql-file';

const SEED = 'database/sql/inserts.sql';
const TELEFONICA_ID = '00000000-0000-0000-0000-000000000418';
const KINEA_RENDA_ID = '00000000-0000-0000-0000-000000000425';
/** Tickers of the excerpt that are not in the seed. */
const OUTSIDE_SEED = ['BCEE5', 'EQPA7', 'HGBS11', 'MGLU3', 'PCEM11'];

describe('Catalog load from the B3 files (integration, K5, D59)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let loadCatalog: LoadCatalog;

  const load = () => loadCatalog.execute(INSTRUMENTS_SAMPLE, COTAHIST_SAMPLE);

  /** Every column of every issuer and asset, plus xmin: equal snapshots mean no row was written. */
  const snapshot = () =>
    prisma.$queryRaw<unknown[]>`
      SELECT 'issuer' AS kind, i.xmin::text, i.id::text, i.name, i.kind::text AS type, i.cnpj, i.cvm_code,
             i.sector_id::text, NULL AS ticker, NULL AS isin, NULL AS share_class, NULL AS bdr_program, NULL AS is_active
      FROM issuers i
      UNION ALL
      SELECT 'asset', a.xmin::text, a.id::text, a.issuer_id::text, a.type::text, NULL, NULL, NULL, a.ticker, a.isin,
             a.share_class::text, a.bdr_program::text, a.is_active::text
      FROM assets a
      ORDER BY 1, 3`;

  const duplicatedIssuerNames = () =>
    prisma.$queryRaw<{ name: string }[]>`
      SELECT name FROM issuers GROUP BY name HAVING count(*) > 1`;

  /** Id and natural key (issuer name, asset ticker) of every row. */
  const identities = () =>
    prisma.$queryRaw<{ id: string; key: string | null }[]>`
      SELECT id::text, name AS key FROM issuers
      UNION ALL
      SELECT id::text, ticker FROM assets
      ORDER BY 1`;

  const assetsOf = (tickers: string[]) =>
    prisma.$queryRaw<
      {
        ticker: string;
        type: string;
        shareClass: string | null;
        issuer: string;
        kind: string;
      }[]
    >`
      SELECT a.ticker, a.type::text, a.share_class::text AS "shareClass", i.name AS issuer, i.kind::text AS kind
      FROM assets a JOIN issuers i ON i.id = a.issuer_id
      WHERE a.ticker = ANY(${tickers}::text[]) ORDER BY a.ticker`;

  beforeAll(async () => {
    app = await createApiApp();
    prisma = app.get(PrismaService);
    loadCatalog = new LoadCatalog(app.get(CatalogWriter));
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('loads on top of the seed without duplicating issuers or assets and keeps the seed rows as they are (seed → K5, F9)', async () => {
    await runSqlFile(SEED);
    const seed = await snapshot();

    const report = await load();

    expect(await duplicatedIssuerNames()).toEqual([]);
    // Only the five assets outside the seed (and their issuers) are new; every seed row, ELET3 included
    // (is_active = false, not in the file), keeps its id, columns and xmin.
    expect(report).toMatchObject({ issuersCreated: 5, assetsWritten: 5 });
    expect(await snapshot()).toEqual(expect.arrayContaining(seed));
    expect(await snapshot()).toHaveLength(seed.length + 10);
    expect(await assetsOf(OUTSIDE_SEED)).toEqual([
      {
        ticker: 'BCEE5',
        type: 'STOCK',
        shareClass: 'PNA',
        issuer: 'BANCO BESA S/A',
        kind: 'COMPANY',
      },
      {
        ticker: 'EQPA7',
        type: 'STOCK',
        shareClass: 'PNC',
        issuer: 'EQUATORIAL PARA DISTRIBUIDORA DE ENERGIA S.A.',
        kind: 'COMPANY',
      },
      {
        ticker: 'HGBS11',
        type: 'FII',
        shareClass: null,
        issuer: 'HEDGE BRASIL SHOPPING FII RESP LIM',
        kind: 'FUND',
      },
      {
        ticker: 'MGLU3',
        type: 'STOCK',
        shareClass: 'ON',
        issuer: 'MAGAZINE LUIZA S.A.',
        kind: 'COMPANY',
      },
      {
        ticker: 'PCEM11',
        type: 'STOCK',
        shareClass: 'PRB',
        issuer: 'PORTO PECEM GERACAO ENERGIA S/A',
        kind: 'COMPANY',
      },
    ]);
    const accented = await prisma.asset.findMany({
      where: { ticker: { in: ['VIVT3', 'KNRI11'] } },
      select: { ticker: true, issuerId: true },
      orderBy: { ticker: 'asc' },
    });
    expect(accented).toEqual([
      { ticker: 'KNRI11', issuerId: KINEA_RENDA_ID },
      { ticker: 'VIVT3', issuerId: TELEFONICA_ID },
    ]);
  });

  it('runs the seed on top of the load without duplicating issuers and keeps the loaded ids (K5 → seed, BD-2)', async () => {
    await load();
    // Only ids, names and tickers: the seed fills cnpj, cvm_code and sector_id of an issuer the load created.
    const loaded = await identities();
    const axia3 = await prisma.asset.findUniqueOrThrow({
      where: { ticker: 'AXIA3' },
    });

    await runSqlFile(SEED);
    const once = await snapshot();
    await runSqlFile(SEED);

    expect(await duplicatedIssuerNames()).toEqual([]);
    expect(await identities()).toEqual(expect.arrayContaining(loaded));
    expect(await snapshot()).toEqual(once);
    // The seed fills the issuers the load created (values of inserts.sql); ELET3 joins the issuer of AXIA3 by CNPJ.
    expect(
      await prisma.$queryRaw`
        SELECT a.ticker, i.id::text AS issuer_id, i.cnpj, i.cvm_code, i.sector_id::text
        FROM assets a JOIN issuers i ON i.id = a.issuer_id
        WHERE a.ticker IN ('PETR4', 'AURA33', 'AXIA3', 'ELET3') ORDER BY a.ticker`,
    ).toEqual([
      {
        ticker: 'AURA33',
        issuer_id: expect.any(String),
        cnpj: null,
        cvm_code: null,
        sector_id: '00000000-0000-0000-0000-000000000306',
      },
      ...['AXIA3', 'ELET3'].map((ticker) => ({
        ticker,
        issuer_id: axia3.issuerId,
        cnpj: '00001180000126',
        cvm_code: '2437',
        sector_id: '00000000-0000-0000-0000-000000000324',
      })),
      {
        ticker: 'PETR4',
        issuer_id: expect.any(String),
        cnpj: '33000167000101',
        cvm_code: '9512',
        sector_id: '00000000-0000-0000-0000-000000000303',
      },
    ]);
  });

  it('changes no row when the same files are loaded again, and ignores invalid lines without failing the batch (D27, arquitetura 6.3)', async () => {
    const first = await load();
    const loaded = await snapshot();

    const second = await load();

    expect(first).toMatchObject({ issuersCreated: 17, assetsWritten: 18 });
    expect(first.rejected.map((line) => line.ticker)).toEqual(['RADL3']);
    expect(second).toMatchObject({ issuersCreated: 0, assetsWritten: 0 });
    expect(await snapshot()).toEqual(loaded);
  });

  it('skips an entry whose ISIN belongs to another ticker and loads the rest of the batch (assets_isin_key)', async () => {
    const issuer = await createIssuer(prisma, { name: 'MAGAZINE LUIZA S.A.' });
    await prisma.asset.create({
      data: {
        ticker: 'MGLU4',
        isin: 'BRMGLUACNOR2',
        type: 'STOCK',
        issuerId: issuer.id,
      },
    });

    const report = await load();

    expect(report.conflicts).toEqual([
      { ticker: 'MGLU3', isin: 'BRMGLUACNOR2', existingTicker: 'MGLU4' },
    ]);
    expect(report.assetsWritten).toBe(17);
    expect(await prisma.asset.count({ where: { ticker: 'MGLU3' } })).toBe(0);
  });

  it('keeps one issuer per name and one asset per ticker under 40 simultaneous loads (revisão de 12/11)', async () => {
    const reports = await Promise.all(Array.from({ length: 40 }, () => load()));

    expect(reports.reduce((sum, r) => sum + r.assetsWritten, 0)).toBe(18);
    expect(reports.reduce((sum, r) => sum + r.issuersCreated, 0)).toBe(17);
    expect(await duplicatedIssuerNames()).toEqual([]);
    expect(await prisma.asset.count()).toBe(18);
  });

  it('updates an existing asset whose trading ended and keeps its id and issuer (D59, TradgEndDt)', async () => {
    await runSqlFile(SEED);
    const before = await prisma.asset.findUniqueOrThrow({
      where: { ticker: 'PETR4' },
    });
    const petr4Ended = instrumentLine({
      TckrSymb: 'PETR4',
      ISIN: 'BRPETRACNPR6',
      SpcfctnCd: 'PN      N2',
      CrpnNm: 'PETROBRAS NOVO NOME S.A.',
      TradgEndDt: '2026-11-30',
    });

    const report = await loadCatalog.execute(
      instrumentsFile([petr4Ended]),
      cotahistOf('20261030'),
    );

    // The new name creates no issuer: the asset keeps its own.
    expect(report).toMatchObject({ issuersCreated: 0, assetsWritten: 1 });
    expect(
      await prisma.asset.findUniqueOrThrow({ where: { ticker: 'PETR4' } }),
    ).toEqual({ ...before, isActive: false });
  });

  it('finds a loaded asset that is not in the seed through GET /assets?search= (C1)', async () => {
    await runSqlFile(SEED);
    await load();
    const { bearer } = await signUp(app, 'ana@example.com');

    const response = await request(app.getHttpServer())
      .get('/api/v1/assets?search=magazine')
      .set('Authorization', bearer)
      .expect(200);

    expect(response.body).toMatchObject({
      items: [{ ticker: 'MGLU3', assetType: 'STOCK' }],
      total: 1,
    });
  });
});
