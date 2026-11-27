import { Logger } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import {
  CDI_TEXT,
  COTAHIST_DAILY_TXT,
  cotahistLine,
  IBOV_TEXT,
  IPCA_TEXT,
} from '../../../../test/factories/market-files.factory';
import {
  download,
  EXCERPT_CATALOG,
  FakeMarketSources,
  FakeSourceLocks,
  InMemoryIndexValueWriter,
  InMemoryIngestionRuns,
  InMemoryQuoteWriter,
  InMemoryRawFiles,
} from '../../../../test/fakes/ingestion-fakes';
import { LocalDate } from '../../../shared/domain/local-date';
import type { QuotedAsset } from '../../market-data/domain/market-data';
import { DailyIngestion } from './daily-ingestion.use-case';
import { IngestIndexes } from './ingest-indexes.use-case';
import { IngestQuotes } from './ingest-quotes.use-case';
import { IngestionRunner } from './ingestion-runner';
import { LoadQuotes, QUOTES_BATCH_SIZE } from './load-quotes.use-case';

const day = (iso: string) => LocalDate.parse(iso);
const COTAHIST_TEXT = readFileSync(COTAHIST_DAILY_TXT, 'latin1');

describe('K6 ingestion use cases (fakes, no database)', () => {
  let sources: FakeMarketSources;
  let raw: InMemoryRawFiles;
  let runs: InMemoryIngestionRuns;
  let quoteWriter: InMemoryQuoteWriter;
  let indexWriter: InMemoryIndexValueWriter;
  let quotes: IngestQuotes;
  let indexes: IngestIndexes;
  let daily: DailyIngestion;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    sources = new FakeMarketSources();
    raw = new InMemoryRawFiles();
    runs = new InMemoryIngestionRuns();
    quoteWriter = new InMemoryQuoteWriter(EXCERPT_CATALOG);
    indexWriter = new InMemoryIndexValueWriter();
    const runner = new IngestionRunner(new FakeSourceLocks(), runs);
    quotes = new IngestQuotes(
      runner,
      sources,
      raw,
      new LoadQuotes(quoteWriter),
    );
    indexes = new IngestIndexes(runner, sources, raw, indexWriter);
    daily = new DailyIngestion(quotes, indexes, runs);
    sources.answers.set(
      'cotahist:2026-11-25',
      download('COTAHIST_D25112026.ZIP', COTAHIST_TEXT),
    );
    sources.answers.set('ibov:2026', download('IBOV_2026.csv', IBOV_TEXT));
    sources.answers.set('sgs:CDI', download('cdi.json', CDI_TEXT, 'utf8'));
    sources.answers.set('sgs:IPCA', download('ipca.json', IPCA_TEXT, 'utf8'));
  });

  afterEach(() => jest.restoreAllMocks());

  describe('IngestQuotes', () => {
    it('downloads the daily COTAHIST to the bronze zone and loads it', async () => {
      const { outcome, report } = await quotes.forDay(day('2026-11-25'));

      expect(outcome).toMatchObject({
        status: 'SUCCEEDED',
        referenceDate: '2026-11-25',
        rowsWritten: 4,
      });
      expect(outcome.file).toMatch(
        /^b3-cotahist\/2026\/COTAHIST_D25112026\.ZIP_[0-9a-f]{64}$/,
      );
      expect(report?.outsideCatalog).toBe(2);
    });

    it('does not load the same daily file twice', async () => {
      await quotes.forDay(day('2026-11-25'));
      const { outcome, report } = await quotes.forDay(day('2026-11-25'));

      expect(outcome).toMatchObject({
        status: 'SUCCEEDED',
        alreadyLoaded: true,
        rowsRead: 0,
      });
      expect(report).toBeUndefined();
    });

    it('ends as NO_FILE when the file is not published (holiday or not yet)', async () => {
      const { outcome } = await quotes.forDay(day('2026-11-20'));

      expect(outcome).toMatchObject({
        status: 'NO_FILE',
        referenceDate: '2026-11-20',
      });
    });

    it('fails a daily file whose header is of another day', async () => {
      sources.answers.set(
        'cotahist:2026-11-24',
        download('COTAHIST_D24112026.ZIP', COTAHIST_TEXT),
      );

      const { outcome } = await quotes.forDay(day('2026-11-24'));

      expect(outcome.error).toBe(
        'The COTAHIST of 2026-11-24 has the header of 2026-11-25',
      );
    });

    it('reprocesses a period one weekday at a time', async () => {
      const results = await quotes.forPeriod(
        day('2026-11-20'),
        day('2026-11-25'),
      );

      expect(
        results.map((r) => [r.outcome.status, r.outcome.referenceDate]),
      ).toEqual([
        ['NO_FILE', '2026-11-20'],
        ['NO_FILE', '2026-11-23'],
        ['NO_FILE', '2026-11-24'],
        ['SUCCEEDED', '2026-11-25'],
      ]);
    });

    it('loads a local file, again on every call (reprocess), with the last quote date', async () => {
      raw.addLocal('/data/COTAHIST_A2026.TXT', COTAHIST_TEXT);

      await quotes.fromFile('/data/COTAHIST_A2026.TXT');
      const { outcome } = await quotes.fromFile('/data/COTAHIST_A2026.TXT');

      expect(outcome).toMatchObject({
        status: 'SUCCEEDED',
        alreadyLoaded: false,
        rowsRead: 6,
        rowsWritten: 0,
      });
      expect(outcome.referenceDate).toBe('2026-11-25');
    });

    it('fails a local file without catalog quotes', async () => {
      const [header, ...rest] = COTAHIST_TEXT.split('\n');
      raw.addLocal(
        '/data/empty.TXT',
        [header, rest.find((l) => l.startsWith('99'))].join('\n'),
      );

      const { outcome } = await quotes.fromFile('/data/empty.TXT');

      expect(outcome.error).toBe(
        'The COTAHIST has no quote of a catalog asset in the cash market',
      );
    });

    it('a failure in the second batch is FAILED with the first batch kept; the next run writes only the rest', async () => {
      // QUOTES_BATCH_SIZE + 1 quotes of 25/11 for as many catalog assets.
      const [header, ...rest] = COTAHIST_TEXT.split('\n');
      const trailer = rest.find((l) => l.startsWith('99'))!;
      const petr4 = cotahistLine('PETR4');
      const catalog: Record<string, QuotedAsset> = {};
      const lines = Array.from({ length: QUOTES_BATCH_SIZE + 1 }, (_, i) => {
        const ticker = `T${String(i).padStart(4, '0')}3`;
        catalog[ticker] = { assetId: ticker, isin: 'BRPETRACNPR6' };
        return `${petr4.slice(0, 12)}${ticker.padEnd(12)}${petr4.slice(24)}`;
      });
      const writer = new InMemoryQuoteWriter(catalog);
      const upsert = writer.upsert.bind(writer);
      jest
        .spyOn(writer, 'upsert')
        .mockImplementationOnce(upsert)
        .mockRejectedValueOnce(new Error('connection lost'));
      const big = new IngestQuotes(
        new IngestionRunner(new FakeSourceLocks(), runs),
        sources,
        raw,
        new LoadQuotes(writer),
      );
      sources.answers.set(
        'cotahist:2026-11-25',
        download(
          'COTAHIST_D25112026.ZIP',
          [header, ...lines, trailer].join('\n'),
        ),
      );

      const failed = await big.forDay(day('2026-11-25'));

      expect(failed.outcome).toMatchObject({
        status: 'FAILED',
        error: 'connection lost',
      });
      expect(writer.rows.size).toBe(QUOTES_BATCH_SIZE);

      const retried = await big.forDay(day('2026-11-25'));

      expect(retried.outcome).toMatchObject({
        status: 'SUCCEEDED',
        alreadyLoaded: false,
        rowsWritten: 1,
      });
    });
  });

  describe('IngestIndexes', () => {
    it('loads the SGS values of the period, with the last date of the data', async () => {
      const cdi = await indexes.sgs(
        'CDI',
        day('2026-11-01'),
        day('2026-11-27'),
      );
      const ipca = await indexes.sgs(
        'IPCA',
        day('2026-01-01'),
        day('2026-11-27'),
      );

      expect(cdi).toMatchObject({
        status: 'SUCCEEDED',
        rowsWritten: 4,
        referenceDate: '2026-11-26',
      });
      expect(cdi.file).toMatch(/^bcb-sgs\/2026\//);
      expect(ipca).toMatchObject({
        status: 'SUCCEEDED',
        rowsWritten: 3,
        referenceDate: '2026-10-01',
      });
      expect(indexWriter.values.get('IPCA|2026-08-01')).toBe('-0.32');
      expect(sources.calls).toContain('sgs:CDI:2026-11-01:2026-11-27');
    });

    it('ends as NO_FILE when the SGS has no value in the period (404)', async () => {
      sources.answers.delete('sgs:CDI');

      expect(
        await indexes.sgs('CDI', day('2026-11-21'), day('2026-11-22')),
      ).toMatchObject({
        status: 'NO_FILE',
        referenceDate: '2026-11-22',
      });
    });

    it('ends as NO_FILE when the answer has no value inside the period', async () => {
      expect(
        await indexes.sgs('CDI', day('2026-11-01'), day('2026-11-20')),
      ).toMatchObject({
        status: 'NO_FILE',
        referenceDate: '2026-11-20',
      });
    });

    it('loads the Ibovespa of the period from the yearly file', async () => {
      const outcome = await indexes.ibov(day('2026-11-01'), day('2026-11-30'));

      expect(outcome).toMatchObject({
        status: 'SUCCEEDED',
        rowsWritten: 4,
        referenceDate: '2026-11-26',
      });
      expect(indexWriter.values.get('IBOV|2026-11-26')).toBe('176799.84');
    });

    it('loads the Ibovespa from a local CSV', async () => {
      raw.addLocal('/data/IBOV_2026.csv', IBOV_TEXT);

      const outcome = await indexes.ibov(day('2026-01-01'), day('2026-12-31'), {
        localFile: '/data/IBOV_2026.csv',
      });

      expect(outcome).toMatchObject({ status: 'SUCCEEDED', rowsWritten: 32 });
    });

    it('in a daily run, a file still without the day ends as NO_FILE (tried again later)', async () => {
      expect(await indexes.daily('B3_IBOV', day('2026-11-27'))).toMatchObject({
        status: 'NO_FILE',
        referenceDate: '2026-11-27',
      });
      expect(indexWriter.values.size).toBe(0);
    });

    it('fails a file of another year', async () => {
      const outcome = await indexes.ibov(
        day('2025-01-01'),
        day('2025-12-31'),
        {},
      );
      sources.answers.set('ibov:2025', download('IBOV_2025.csv', IBOV_TEXT));
      const wrongYear = await indexes.ibov(
        day('2025-01-01'),
        day('2025-12-31'),
      );

      expect(outcome.status).toBe('NO_FILE');
      expect(wrongYear.error).toBe('The IBOV file is of 2026, not of 2025');
    });

    it('refuses a period across two years', () => {
      expect(() => indexes.ibov(day('2025-12-01'), day('2026-01-31'))).toThrow(
        'The Ibovespa is loaded one year at a time',
      );
    });

    it('asks the SGS for recent windows in the daily runs', async () => {
      await indexes.daily('BCB_SGS_CDI', day('2026-11-26'));
      await indexes.daily('BCB_SGS_IPCA', day('2026-11-26'));

      expect(sources.calls).toEqual(
        expect.arrayContaining([
          'sgs:CDI:2026-10-27:2026-11-26',
          'sgs:IPCA:2026-07-29:2026-11-26',
        ]),
      );
    });

    it('on the first trading day of a year, asks for the new IBOV file and the SGS window across the years', async () => {
      sources.answers.set('sgs:CDI', download('cdi.json', CDI_TEXT, 'utf8'));

      const ibov = await indexes.daily('B3_IBOV', day('2027-01-04'));
      const cdi = await indexes.daily('BCB_SGS_CDI', day('2027-01-04'));

      expect(sources.calls).toContain('ibov:2027');
      expect(ibov).toMatchObject({
        status: 'NO_FILE',
        referenceDate: '2027-01-04',
      });
      expect(sources.calls).toContain('sgs:CDI:2026-12-05:2027-01-04');
      expect(cdi.file).toMatch(/^bcb-sgs\/2027\//);
    });

    it('loads the same IBOV file again (no skip by hash): the upsert keeps it idempotent', async () => {
      await indexes.ibov(day('2026-11-01'), day('2026-11-30'));
      const again = await indexes.ibov(day('2026-11-01'), day('2026-11-30'));

      expect(again).toMatchObject({
        status: 'SUCCEEDED',
        alreadyLoaded: false,
        rowsRead: 4,
        rowsWritten: 0,
      });
    });
  });

  describe('DailyIngestion', () => {
    it('runs every source of the trading day and purges old unsuccessful runs', async () => {
      const outcomes = await daily.run(day('2026-11-25'));

      expect(outcomes.map((o) => [o.source, o.status])).toEqual([
        ['B3_COTAHIST', 'SUCCEEDED'],
        ['B3_IBOV', 'SUCCEEDED'],
        ['BCB_SGS_CDI', 'SUCCEEDED'],
        ['BCB_SGS_IPCA', 'SUCCEEDED'],
      ]);
      expect(runs.purgedBefore).toEqual([new Date('2026-08-27T00:00:00Z')]);
    });

    it('runs only the given sources', async () => {
      const outcomes = await daily.run(day('2026-11-25'), ['B3_IBOV']);

      expect(outcomes.map((o) => o.source)).toEqual(['B3_IBOV']);
    });

    it('keeps going when a run cannot be recorded, reporting it as FAILED', async () => {
      jest
        .spyOn(runs, 'start')
        .mockRejectedValueOnce(new Error('database down'));

      const outcomes = await daily.run(day('2026-11-25'));

      expect(outcomes[0]).toMatchObject({
        source: 'B3_COTAHIST',
        status: 'FAILED',
        error: 'database down',
      });
      expect(outcomes.slice(1).every((o) => o.status === 'SUCCEEDED')).toBe(
        true,
      );
    });

    it('reports a thrown non-Error as text and survives a failed purge', async () => {
      jest.spyOn(runs, 'start').mockRejectedValueOnce('boom');
      jest
        .spyOn(runs, 'purgeUnsuccessfulBefore')
        .mockRejectedValue(new Error('purge failed'));

      const outcomes = await daily.run(day('2026-11-25'), ['B3_COTAHIST']);

      expect(outcomes[0].error).toBe('boom');
    });
  });
});
