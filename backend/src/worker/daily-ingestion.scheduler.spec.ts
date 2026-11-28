import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { readFileSync } from 'node:fs';
import {
  CDI_TEXT,
  COTAHIST_DAILY_TXT,
  IBOV_TEXT,
  IPCA_TEXT,
} from '../../test/factories/market-files.factory';
import {
  download,
  EXCERPT_CATALOG,
  FakeMarketSources,
  FakeSourceLocks,
  InMemoryIndexValueWriter,
  InMemoryIngestionRuns,
  InMemoryLatestCloseDate,
  InMemoryQuoteWriter,
  InMemoryRawFiles,
} from '../../test/fakes/ingestion-fakes';
import type { WorkerEnv } from '../config/env';
import { DailyIngestion } from '../modules/ingestion/application/daily-ingestion.use-case';
import { IngestIndexes } from '../modules/ingestion/application/ingest-indexes.use-case';
import { IngestQuotes } from '../modules/ingestion/application/ingest-quotes.use-case';
import { IngestionRunner } from '../modules/ingestion/application/ingestion-runner';
import { LoadQuotes } from '../modules/ingestion/application/load-quotes.use-case';
import { SystemClock } from '../shared/infrastructure/system-clock';
import {
  DAILY_TIMEOUT,
  DailyIngestionScheduler,
  RETRY_TIMEOUT,
} from './daily-ingestion.scheduler';

const MINUTE = 60_000;
const COTAHIST_TEXT = readFileSync(COTAHIST_DAILY_TXT, 'latin1');
/** The daily COTAHIST excerpt of 25/11 moved to another trading day (header and quote dates). */
const cotahistOf = (iso: string) =>
  download(
    `COTAHIST_D${iso.split('-').reverse().join('')}.ZIP`,
    COTAHIST_TEXT.replaceAll('20261125', iso.replaceAll('-', '')),
  );
const ENV = {
  INGESTION_DAILY_TIME: '21:30',
  INGESTION_RETRY_INTERVAL_MINUTES: 30,
  INGESTION_MAX_ATTEMPTS: 3,
};

/** Real use cases over fakes of the sources, the bronze zone and the database; the clock is Jest's fake one. */
describe('DailyIngestionScheduler (K6, fake clock)', () => {
  let registry: SchedulerRegistry;
  let sources: FakeMarketSources;
  let runs: InMemoryIngestionRuns;
  let quotes: InMemoryQuoteWriter;
  let daily: DailyIngestion;
  let runSpy: jest.SpyInstance<
    ReturnType<DailyIngestion['run']>,
    Parameters<DailyIngestion['run']>
  >;

  const start = (now: string) => {
    jest.setSystemTime(new Date(now));
    const config = {
      get: (key: keyof typeof ENV) => ENV[key],
    } as unknown as ConfigService<WorkerEnv, true>;
    new DailyIngestionScheduler(
      registry,
      daily,
      new SystemClock(),
      config,
    ).onApplicationBootstrap();
  };
  const advanceTo = (iso: string) =>
    jest.advanceTimersByTimeAsync(new Date(iso).getTime() - Date.now());
  const ranDays = () =>
    runSpy.mock.calls.map(([day, sources]) => [String(day), sources ?? 'all']);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    registry = new SchedulerRegistry();
    sources = new FakeMarketSources();
    runs = new InMemoryIngestionRuns();
    const raw = new InMemoryRawFiles();
    const runner = new IngestionRunner(new FakeSourceLocks(), runs);
    quotes = new InMemoryQuoteWriter(EXCERPT_CATALOG);
    daily = new DailyIngestion(
      new IngestQuotes(runner, sources, raw, new LoadQuotes(quotes)),
      new IngestIndexes(runner, sources, raw, new InMemoryIndexValueWriter()),
      runs,
      new InMemoryLatestCloseDate(quotes),
    );
    runSpy = jest.spyOn(daily, 'run');
    sources.answers.set(
      'cotahist:2026-11-25',
      download('COTAHIST_D25112026.ZIP', COTAHIST_TEXT),
    );
    sources.answers.set('ibov:2026', download('IBOV_2026.csv', IBOV_TEXT));
    sources.answers.set('sgs:CDI', download('cdi.json', CDI_TEXT, 'utf8'));
    sources.answers.set('sgs:IPCA', download('ipca.json', IPCA_TEXT, 'utf8'));
  });

  afterEach(() => {
    for (const name of registry.getTimeouts()) registry.deleteTimeout(name);
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('runs every source on a weekday at the configured São Paulo time, then schedules the next weekday', async () => {
    start('2026-11-25T12:00:00-03:00');

    await advanceTo('2026-11-25T21:29:59-03:00');
    expect(runSpy).not.toHaveBeenCalled();

    await advanceTo('2026-11-25T21:30:00-03:00');
    expect(ranDays()).toEqual([['2026-11-25', 'all']]);
    expect(runs.runs.map((r) => [r.source, r.status])).toEqual([
      ['B3_COTAHIST', 'SUCCEEDED'],
      ['B3_IBOV', 'SUCCEEDED'],
      ['BCB_SGS_CDI', 'SUCCEEDED'],
      ['BCB_SGS_IPCA', 'SUCCEEDED'],
    ]);
    expect(registry.doesExist('timeout', RETRY_TIMEOUT)).toBe(false);
    expect(registry.doesExist('timeout', DAILY_TIMEOUT)).toBe(true);
  });

  it('does nothing on the weekend and runs on Monday', async () => {
    start('2026-11-28T10:00:00-03:00'); // Saturday

    await advanceTo('2026-11-30T21:00:00-03:00');
    expect(runSpy).not.toHaveBeenCalled();

    await advanceTo('2026-11-30T21:30:00-03:00');
    expect(ranDays()).toEqual([['2026-11-30', 'all']]);
  });

  it('tries again the sources without the file of the day (NO_FILE), for the same day, up to the attempt limit', async () => {
    start('2026-11-27T20:00:00-03:00'); // Friday: no COTAHIST nor IBOV of 27/11 in the fakes

    await advanceTo('2026-11-27T21:30:00-03:00');
    await advanceTo('2026-11-27T22:00:00-03:00');
    expect(ranDays()).toEqual([
      ['2026-11-27', 'all'],
      ['2026-11-27', ['B3_COTAHIST', 'B3_IBOV']],
    ]);

    // Published before the third and last attempt: the COTAHIST arrives; the IBOV still not.
    sources.answers.set(
      'cotahist:2026-11-27',
      download(
        'COTAHIST_D27112026.ZIP',
        COTAHIST_TEXT.replaceAll('20261125', '20261127'),
      ),
    );
    await advanceTo('2026-11-27T22:30:00-03:00');
    await advanceTo('2026-11-28T03:00:00-03:00');

    expect(ranDays()).toHaveLength(3);
    const cotahist = runs.runs
      .filter((r) => r.source === 'B3_COTAHIST')
      .map((r) => r.status);
    expect(cotahist).toEqual(['NO_FILE', 'NO_FILE', 'SUCCEEDED']);
    expect(registry.doesExist('timeout', RETRY_TIMEOUT)).toBe(false);
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.objectContaining({ sources: ['B3_IBOV'], attempt: 3 }),
      'Daily ingestion gave up for the day',
    );
  });

  it('survives a network failure of a source and tries it again, without stopping the worker', async () => {
    sources.answers.set('cotahist:2026-11-25', new TypeError('fetch failed'));
    start('2026-11-25T21:00:00-03:00');

    await advanceTo('2026-11-25T21:30:00-03:00');
    expect(runs.runs[0]).toMatchObject({
      source: 'B3_COTAHIST',
      status: 'FAILED',
    });

    sources.answers.set(
      'cotahist:2026-11-25',
      download('COTAHIST_D25112026.ZIP', COTAHIST_TEXT),
    );
    await advanceTo('2026-11-25T22:00:00-03:00');
    expect(ranDays()[1]).toEqual(['2026-11-25', ['B3_COTAHIST']]);
    expect(runs.runs.at(-1)).toMatchObject({
      source: 'B3_COTAHIST',
      status: 'SUCCEEDED',
    });
  });

  it('tries every source again when the whole run crashes', async () => {
    runSpy.mockRejectedValueOnce(new Error('crash'));
    start('2026-11-25T21:00:00-03:00');

    await advanceTo('2026-11-25T22:00:00-03:00');

    expect(ranDays()).toEqual([
      ['2026-11-25', 'all'],
      ['2026-11-25', ['B3_COTAHIST', 'B3_IBOV', 'BCB_SGS_CDI', 'BCB_SGS_IPCA']],
    ]);
  });

  it('the COTAHIST of yesterday served again today never ends SUCCEEDED with the old date', async () => {
    start('2026-11-25T21:00:00-03:00');
    await advanceTo('2026-11-25T21:30:00-03:00');
    // The next weekday the B3 still serves the file of 25/11 under the name of 26/11: same hash.
    sources.answers.set(
      'cotahist:2026-11-26',
      sources.answers.get('cotahist:2026-11-25')!,
    );

    await advanceTo('2026-11-26T22:00:00-03:00');

    const cotahist = runs.runs.filter((r) => r.source === 'B3_COTAHIST');
    expect(cotahist.map((r) => r.status)).toEqual([
      'SUCCEEDED',
      'FAILED',
      'FAILED',
    ]);
    expect(cotahist[1].end).toMatchObject({
      error: 'The COTAHIST of 2026-11-26 has the header of 2026-11-25',
    });
    expect(ranDays().filter(([d]) => d === '2026-11-26')).toEqual([
      ['2026-11-26', 'all'],
      ['2026-11-26', ['B3_COTAHIST']],
    ]);
  });

  it('the IBOV file of yesterday, the same bytes today, ends NO_FILE and is tried again', async () => {
    start('2026-11-26T21:00:00-03:00');
    await advanceTo('2026-11-26T21:30:00-03:00');

    await advanceTo('2026-11-27T22:00:00-03:00');

    const ibov = runs.runs.filter((r) => r.source === 'B3_IBOV');
    expect(
      ibov.map((r) => [
        r.status,
        r.end && 'referenceDate' in r.end && String(r.end.referenceDate),
      ]),
    ).toEqual([
      ['SUCCEEDED', '2026-11-26'],
      ['NO_FILE', '2026-11-27'],
      ['NO_FILE', '2026-11-27'],
    ]);
    expect(ranDays().filter(([d]) => d === '2026-11-27')[1]).toEqual([
      '2026-11-27',
      ['B3_COTAHIST', 'B3_IBOV'],
    ]);
  });

  describe('catch-up (D64c)', () => {
    /** Quotes loaded up to the date, as the seed or an earlier run leaves them. */
    const closeOn = (iso: string) =>
      quotes.upsert([
        {
          assetId: 'petr4',
          date: iso,
          open: '1',
          high: '1',
          low: '1',
          close: '1',
          volume: '1',
          tradesCount: 1,
        },
      ]);
    const quoteRuns = () =>
      runs.runs
        .filter((r) => r.source === 'B3_COTAHIST')
        .map((r) => [
          r.end && 'referenceDate' in r.end && String(r.end.referenceDate),
          r.status,
        ]);

    it('the daily run recovers the days missed since the last close; a holiday in the middle is not tried again', async () => {
      await closeOn('2026-11-19');
      sources.answers.set('cotahist:2026-11-23', cotahistOf('2026-11-23'));
      sources.answers.set('cotahist:2026-11-24', cotahistOf('2026-11-24'));
      // A worker that was already up (e.g. the B3 was out for days), so nothing runs at start.
      jest.spyOn(daily, 'isBehind').mockResolvedValue(false);
      start('2026-11-25T21:00:00-03:00');

      await advanceTo('2026-11-25T23:00:00-03:00');

      expect(quoteRuns()).toEqual([
        ['2026-11-20', 'NO_FILE'],
        ['2026-11-23', 'SUCCEEDED'],
        ['2026-11-24', 'SUCCEEDED'],
        ['2026-11-25', 'SUCCEEDED'],
      ]);
      expect(ranDays()).toEqual([['2026-11-25', 'all']]);
      expect(registry.doesExist('timeout', RETRY_TIMEOUT)).toBe(false);
    });

    it('a worker started after the time catches up the missed weekday at once, then keeps the daily schedule', async () => {
      await closeOn('2026-11-24');
      start('2026-11-28T10:00:00-03:00'); // Saturday: the run of Friday 27/11 was missed

      await jest.advanceTimersByTimeAsync(0);

      expect(ranDays()).toEqual([['2026-11-27', 'all']]);
      expect(quoteRuns()).toEqual([
        ['2026-11-25', 'SUCCEEDED'],
        ['2026-11-26', 'NO_FILE'],
        ['2026-11-27', 'NO_FILE'],
      ]);
      // The day the worker targets has no file yet: tried again like a daily run.
      expect(registry.doesExist('timeout', RETRY_TIMEOUT)).toBe(true);
      expect(registry.doesExist('timeout', DAILY_TIMEOUT)).toBe(true);
    });

    it('a worker started before the time of the day catches up only to the previous weekday', async () => {
      await closeOn('2026-11-23');
      sources.answers.set('cotahist:2026-11-24', cotahistOf('2026-11-24'));
      start('2026-11-25T12:00:00-03:00');

      await jest.advanceTimersByTimeAsync(0);

      expect(ranDays()).toEqual([['2026-11-24', 'all']]);
      expect(quoteRuns()).toEqual([['2026-11-24', 'SUCCEEDED']]);
    });

    it('a worker started with the quotes up to date (or none at all) waits for the next daily run', async () => {
      await closeOn('2026-11-27');
      start('2026-11-28T10:00:00-03:00');

      await advanceTo('2026-11-30T21:00:00-03:00');

      expect(runSpy).not.toHaveBeenCalled();
    });

    it('a failure to read the last close at start is logged and the daily schedule goes on', async () => {
      jest.spyOn(daily, 'isBehind').mockRejectedValueOnce(new Error('db down'));
      start('2026-11-28T10:00:00-03:00');

      await jest.advanceTimersByTimeAsync(0);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: RETRY_TIMEOUT }),
        'Scheduled ingestion task failed',
      );
      expect(registry.doesExist('timeout', DAILY_TIMEOUT)).toBe(true);
    });
  });

  it('a new trading day replaces the retries of the previous one', async () => {
    ENV.INGESTION_MAX_ATTEMPTS = 12;
    ENV.INGESTION_RETRY_INTERVAL_MINUTES = 180;
    try {
      start('2026-11-30T21:00:00-03:00'); // no file of 30/11 in the fakes: retried every 3 h
      await advanceTo('2026-12-01T21:30:00-03:00');
      expect(ranDays().at(-1)).toEqual(['2026-12-01', 'all']);
      const before = ranDays().length;

      await jest.advanceTimersByTimeAsync(12 * 180 * MINUTE);

      expect(
        ranDays()
          .slice(before)
          .map(([d]) => d),
      ).not.toContain('2026-11-30');
    } finally {
      ENV.INGESTION_MAX_ATTEMPTS = 3;
      ENV.INGESTION_RETRY_INTERVAL_MINUTES = 30;
    }
  });
});
