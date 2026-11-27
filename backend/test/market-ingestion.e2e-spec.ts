import type { INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Logger as PinoLogger } from 'nestjs-pino';
import { Client } from 'pg';
import { validatedConfigModule } from '../src/config/config.module';
import { workerEnvSchema } from '../src/config/env';
import { DailyIngestion } from '../src/modules/ingestion/application/daily-ingestion.use-case';
import { IngestIndexes } from '../src/modules/ingestion/application/ingest-indexes.use-case';
import { IngestQuotes } from '../src/modules/ingestion/application/ingest-quotes.use-case';
import {
  IngestionRuns,
  MarketSources,
} from '../src/modules/ingestion/domain/ingestion-run';
import { ORPHAN_RUN_ERROR } from '../src/modules/ingestion/infrastructure/prisma-ingestion-runs';
import { IngestionModule } from '../src/modules/ingestion/ingestion.module';
import { LatestCloseDate } from '../src/modules/market-data/domain/market-data';
import { LocalDate } from '../src/shared/domain/local-date';
import { LoggingModule } from '../src/shared/infrastructure/logging/logging.module';
import { PrismaModule } from '../src/shared/infrastructure/prisma/prisma.module';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import {
  CDI_TEXT,
  COTAHIST_DAILY_TXT,
  COTAHIST_DAILY_ZIP,
  IBOV_CSV,
  IBOV_TEXT,
  IPCA_TEXT,
} from './factories/market-files.factory';
import { download, FakeMarketSources } from './fakes/ingestion-fakes';
import { truncateAllTables } from './utils/database';
import { runSqlFile } from './utils/sql-file';

const SEED = 'database/sql/inserts.sql';
const day = (iso: string) => LocalDate.parse(iso);
const cotahistDownload = () =>
  download(
    'COTAHIST_D25112026.ZIP',
    readFileSync(COTAHIST_DAILY_ZIP).toString('latin1'),
  );

/**
 * K6 against PostgreSQL (Testcontainers): the real IngestionModule (Prisma writers, ops.ingestion_runs, advisory locks,
 * bronze on disk) with the network replaced by the fixtures. Catalog and economic indexes from the seed.
 */
describe('Market data ingestion (integration, K6, D64)', () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let sources: FakeMarketSources;
  let quotes: IngestQuotes;
  let indexes: IngestIndexes;
  let raw: string;

  /** Every quote and index value with xmin: equal snapshots mean no row was written. */
  const snapshot = () =>
    prisma.$queryRaw<unknown[]>`
      SELECT 'q' AS t, q.xmin::text, q.asset_id::text AS k, q.quote_date::text AS d, q.close::text AS v FROM quotes q
      UNION ALL
      SELECT 'i', i.xmin::text, i.economic_index_id::text, i.reference_date::text, i.value::text FROM index_values i
      ORDER BY 1, 3, 4`;
  const runsOf = (source: string) =>
    prisma.$queryRaw<
      {
        status: string;
        fileName: string | null;
        sha: string | null;
        referenceDate: string | null;
        rowsRead: number;
        rowsWritten: number;
        error: string | null;
      }[]
    >`
      SELECT status::text, file_name AS "fileName", file_sha256 AS sha, reference_date::text AS "referenceDate",
             rows_read AS "rowsRead", rows_written AS "rowsWritten", error
      FROM ops.ingestion_runs WHERE source = ${source} ORDER BY started_at`;
  const quoteOf = (ticker: string, date: string) =>
    prisma.$queryRaw<
      {
        open: string;
        high: string;
        low: string;
        close: string;
        volume: string;
        trades: number;
      }[]
    >`
      SELECT q.open::text, q.high::text, q.low::text, q.close::text, q.volume::text, q.trades_count AS trades
      FROM quotes q JOIN assets a ON a.id = q.asset_id
      WHERE a.ticker = ${ticker} AND q.quote_date = ${date}::date`;

  beforeAll(async () => {
    raw = mkdtempSync(join(tmpdir(), 'k6-bronze-'));
    process.env.RAW_DATA_DIR = raw;
    sources = new FakeMarketSources();
    const moduleRef = await Test.createTestingModule({
      imports: [
        validatedConfigModule(workerEnvSchema),
        LoggingModule,
        PrismaModule,
        IngestionModule,
      ],
    })
      .overrideProvider(MarketSources)
      .useValue(sources)
      .compile();
    // Logs through pino, silent in tests (LOG_LEVEL of the global setup).
    moduleRef.useLogger(moduleRef.get(PinoLogger));
    app = await moduleRef.init();
    prisma = app.get(PrismaService);
    quotes = app.get(IngestQuotes);
    indexes = app.get(IngestIndexes);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    await runSqlFile(SEED);
    sources.answers.clear();
    sources.answers.set('cotahist:2026-11-25', cotahistDownload());
  });

  afterAll(async () => {
    await app.close();
    rmSync(raw, { recursive: true, force: true });
    delete process.env.RAW_DATA_DIR;
  });

  describe('quotes (COTAHIST)', () => {
    it('loads the daily file of catalog assets, records the run and keeps the file in the bronze zone', async () => {
      const { outcome, report } = await quotes.forDay(day('2026-11-25'));

      expect(outcome).toMatchObject({
        status: 'SUCCEEDED',
        rowsRead: 6,
        rowsWritten: 4,
        rowsRejected: 0,
      });
      expect(report?.outsideCatalog).toBe(2); // MGLU3 and IBOV11 are not in the seed
      expect(await quoteOf('PETR4', '2026-11-25')).toEqual([
        {
          open: '40.70000000',
          high: '41.51000000',
          low: '40.41000000',
          close: '41.36000000',
          volume: '2643622356.00',
          trades: 96311,
        },
      ]);
      const [run] = await runsOf('B3_COTAHIST');
      expect(run).toMatchObject({
        status: 'SUCCEEDED',
        referenceDate: '2026-11-25',
        rowsRead: 6,
        rowsWritten: 4,
      });
      expect(run.fileName).toBe(
        `b3-cotahist/2026/COTAHIST_D25112026_${run.sha}.ZIP`,
      );
      expect(readFileSync(join(raw, run.fileName!))).toEqual(
        readFileSync(COTAHIST_DAILY_ZIP),
      );
    });

    it('the same day run twice changes no row: the repeated file is not loaded (D27)', async () => {
      await quotes.forDay(day('2026-11-25'));
      const before = await snapshot();

      const { outcome } = await quotes.forDay(day('2026-11-25'));

      expect(outcome).toMatchObject({
        status: 'SUCCEEDED',
        alreadyLoaded: true,
        rowsWritten: 0,
      });
      expect(await snapshot()).toEqual(before);
      expect(
        (await runsOf('B3_COTAHIST')).map((r) => [r.status, r.rowsRead]),
      ).toEqual([
        ['SUCCEEDED', 6],
        ['SUCCEEDED', 0],
      ]);
    });

    it('a local file loaded twice (reprocess) writes nothing the second time', async () => {
      await quotes.fromFile(COTAHIST_DAILY_TXT);
      const before = await snapshot();

      const { outcome } = await quotes.fromFile(COTAHIST_DAILY_ZIP);

      expect(outcome).toMatchObject({
        status: 'SUCCEEDED',
        rowsRead: 6,
        rowsWritten: 0,
      });
      expect(await snapshot()).toEqual(before);
    });

    it('a day without file (holiday, not published) is NO_FILE with the date and no error', async () => {
      const { outcome } = await quotes.forDay(day('2026-11-20'));

      expect(outcome.status).toBe('NO_FILE');
      expect(await runsOf('B3_COTAHIST')).toEqual([
        expect.objectContaining({
          status: 'NO_FILE',
          referenceDate: '2026-11-20',
          error: null,
          fileName: null,
        }),
      ]);
    });

    it('a network failure is FAILED with the error, and the next run loads', async () => {
      sources.answers.set('cotahist:2026-11-25', new TypeError('fetch failed'));
      expect((await quotes.forDay(day('2026-11-25'))).outcome.status).toBe(
        'FAILED',
      );

      sources.answers.set('cotahist:2026-11-25', cotahistDownload());
      await quotes.forDay(day('2026-11-25'));

      expect(
        (await runsOf('B3_COTAHIST')).map((r) => [r.status, r.error]),
      ).toEqual([
        ['FAILED', 'fetch failed'],
        ['SUCCEEDED', null],
      ]);
    });

    it('closes as FAILED a RUNNING run left by a worker that stopped', async () => {
      await prisma.$executeRaw`INSERT INTO ops.ingestion_runs (source) VALUES ('B3_COTAHIST')`;

      await quotes.forDay(day('2026-11-25'));

      expect(
        (await runsOf('B3_COTAHIST')).map((r) => [r.status, r.error]),
      ).toEqual([
        ['FAILED', ORPHAN_RUN_ERROR],
        ['SUCCEEDED', null],
      ]);
    });

    it('does not run while another process holds the lock of the source (advisory lock, D24)', async () => {
      const other = new Client({ connectionString: process.env.DATABASE_URL });
      await other.connect();
      try {
        await other.query(
          `SELECT pg_advisory_lock(hashtext('ingestion:B3_COTAHIST'))`,
        );

        const { outcome } = await quotes.forDay(day('2026-11-25'));

        expect(outcome.status).toBe('BUSY');
        expect(await runsOf('B3_COTAHIST')).toEqual([]);
      } finally {
        await other.end();
      }
      expect((await quotes.forDay(day('2026-11-25'))).outcome.status).toBe(
        'SUCCEEDED',
      );
    });

    it('stores an error without NUL bytes and never rewrites a run already closed by another process', async () => {
      const runs = app.get(IngestionRuns);
      const id = await runs.start('B3_COTAHIST');

      await runs.finish(id, {
        status: 'FAILED',
        error: 'bad "\u0000\u0000" field',
      });

      expect((await runsOf('B3_COTAHIST'))[0].error).toBe('bad "" field');
      await expect(
        runs.finish(id, { status: 'NO_FILE', referenceDate: '2026-11-25' }),
      ).rejects.toThrow('is no longer RUNNING');
    });

    it('gives the date of the last close for K7 and K8, null without quotes', async () => {
      await prisma.$executeRaw`DELETE FROM quotes`;
      expect(await app.get(LatestCloseDate).get()).toBeNull();

      await quotes.forDay(day('2026-11-25'));

      expect(String(await app.get(LatestCloseDate).get())).toBe('2026-11-25');
    });
  });

  const answerIndexes = () => {
    sources.answers.set('sgs:CDI', download('cdi.json', CDI_TEXT, 'utf8'));
    sources.answers.set('sgs:IPCA', download('ipca.json', IPCA_TEXT, 'utf8'));
    sources.answers.set('ibov:2026', download('IBOV_2026.csv', IBOV_TEXT));
  };

  describe('indexes (BCB SGS and B3)', () => {
    beforeEach(answerIndexes);

    const valuesOf = (code: string) =>
      prisma.$queryRaw<{ date: string; value: string }[]>`
        SELECT v.reference_date::text AS date, v.value::text FROM index_values v
        JOIN economic_indexes e ON e.id = v.economic_index_id WHERE e.code = ${code}::index_code
        ORDER BY 1`;

    it('loads CDI, IPCA and Ibovespa; a second run changes nothing', async () => {
      const load = async () => [
        await indexes.sgs('CDI', day('2026-11-01'), day('2026-11-27')),
        await indexes.sgs('IPCA', day('2026-01-01'), day('2026-11-27')),
        await indexes.ibov(day('2026-11-01'), day('2026-11-30'), {
          localFile: IBOV_CSV,
        }),
      ];

      const first = await load();
      const before = await snapshot();
      const second = await load();

      expect(first.map((o) => [o.source, o.status, o.rowsWritten])).toEqual([
        ['BCB_SGS_CDI', 'SUCCEEDED', 4],
        ['BCB_SGS_IPCA', 'SUCCEEDED', 3],
        // 23–26/11; the seed has the IBOV up to 12/11.
        ['B3_IBOV', 'SUCCEEDED', 4],
      ]);
      expect(second.map((o) => o.rowsWritten)).toEqual([0, 0, 0]);
      expect(await snapshot()).toEqual(before);
      expect((await valuesOf('IPCA')).at(0)).toEqual({
        date: '2026-08-01',
        value: '-0.32000000',
      });
      expect((await valuesOf('IBOV')).at(-1)).toEqual({
        date: '2026-11-26',
        value: '176799.84000000',
      });
    });

    it('the daily run of a day not yet in the IBOV file is NO_FILE and writes nothing', async () => {
      const before = await snapshot();

      expect(await indexes.daily('B3_IBOV', day('2026-11-27'))).toMatchObject({
        status: 'NO_FILE',
      });
      expect(await snapshot()).toEqual(before);
      expect(await runsOf('B3_IBOV')).toEqual([
        expect.objectContaining({
          status: 'NO_FILE',
          referenceDate: '2026-11-27',
        }),
      ]);
    });
  });

  it('the daily ingestion runs every source and purges NO_FILE and FAILED runs older than 90 days', async () => {
    answerIndexes();
    await prisma.$executeRaw`
      INSERT INTO ops.ingestion_runs (source, status, reference_date, started_at, finished_at, file_name, file_sha256, error)
      VALUES ('B3_COTAHIST', 'NO_FILE', '2026-01-01', '2026-01-02', '2026-01-02', NULL, NULL, NULL),
             ('B3_COTAHIST', 'SUCCEEDED', '2026-01-05', '2026-01-05', '2026-01-05', 'old.zip', ${'b'.repeat(64)}, NULL)`;

    const outcomes = await app.get(DailyIngestion).run(day('2026-11-25'));

    expect(outcomes.map((o) => [o.source, o.status])).toEqual([
      ['B3_COTAHIST', 'SUCCEEDED'],
      ['B3_IBOV', 'SUCCEEDED'],
      ['BCB_SGS_CDI', 'SUCCEEDED'],
      ['BCB_SGS_IPCA', 'SUCCEEDED'],
    ]);
    expect((await runsOf('B3_COTAHIST')).map((r) => r.status)).toEqual([
      'SUCCEEDED',
      'SUCCEEDED',
    ]);
  });
});
