import { Logger } from '@nestjs/common';
import {
  FakeSourceLocks,
  InMemoryIngestionRuns,
} from '../../../../test/fakes/ingestion-fakes';
import { LocalDate } from '../../../shared/domain/local-date';
import type { SourceFile } from '../domain/ingestion-run';
import {
  type Acquired,
  IngestionRunner,
  isRetryable,
  type Loaded,
} from './ingestion-runner';

const FILE: SourceFile = {
  path: '/raw/f.zip',
  name: 'f.zip',
  sha256: 'a'.repeat(64),
};
const day = (iso: string) => LocalDate.parse(iso);
const LOADED: Loaded = {
  kind: 'LOADED',
  referenceDate: day('2026-11-25'),
  rowsRead: 10,
  rowsWritten: 7,
  rowsRejected: 1,
};

describe('IngestionRunner (arquitetura 6.3, BD-3)', () => {
  let locks: FakeSourceLocks;
  let runs: InMemoryIngestionRuns;
  let runner: IngestionRunner;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    locks = new FakeSourceLocks();
    runs = new InMemoryIngestionRuns();
    runner = new IngestionRunner(locks, runs);
  });

  afterEach(() => jest.restoreAllMocks());

  const run = (acquired: Acquired | Error, loaded: Loaded | Error = LOADED) =>
    runner.run('B3_COTAHIST', {
      acquire: () =>
        acquired instanceof Error
          ? Promise.reject(acquired)
          : Promise.resolve(acquired),
      load: () =>
        loaded instanceof Error
          ? Promise.reject(loaded)
          : Promise.resolve(loaded),
    });

  it('loads a file and closes the run as SUCCEEDED with the counts, releasing the lock', async () => {
    const outcome = await run({ kind: 'FILE', file: FILE });

    expect(outcome).toMatchObject({
      status: 'SUCCEEDED',
      file: 'f.zip',
      referenceDate: '2026-11-25',
      rowsRead: 10,
      rowsWritten: 7,
      rowsRejected: 1,
      alreadyLoaded: false,
    });
    expect(runs.runs).toEqual([
      {
        id: 'run-1',
        source: 'B3_COTAHIST',
        status: 'SUCCEEDED',
        end: {
          status: 'SUCCEEDED',
          file: FILE,
          referenceDate: day('2026-11-25'),
          rowsRead: 10,
          rowsWritten: 7,
          rowsRejected: 1,
        },
      },
    ]);
    expect(locks.released).toBe(1);
  });

  it('records NO_FILE with the reference date when the source has no file (not published, no trading)', async () => {
    const outcome = await run({
      kind: 'NO_FILE',
      referenceDate: day('2026-11-20'),
    });

    expect(outcome).toMatchObject({
      status: 'NO_FILE',
      referenceDate: '2026-11-20',
    });
    expect(runs.runs[0].end).toEqual({
      status: 'NO_FILE',
      referenceDate: day('2026-11-20'),
    });
    expect(isRetryable(outcome)).toBe(true);
  });

  it('records NO_FILE when the file has no data for the run (e.g. the IBOV without the day)', async () => {
    const outcome = await run(
      { kind: 'FILE', file: FILE },
      { kind: 'NO_DATA', referenceDate: day('2026-11-25') },
    );

    expect(outcome).toMatchObject({ status: 'NO_FILE', file: 'f.zip' });
    expect(runs.runs[0].end).toEqual({
      status: 'NO_FILE',
      referenceDate: day('2026-11-25'),
      file: FILE,
    });
  });

  it('does not load again a downloaded file already loaded for the same date (same hash, D27)', async () => {
    await run({ kind: 'FILE', file: FILE, skipIfLoadedFor: day('2026-11-25') });
    const load = jest.fn();
    const outcome = await runner.run('B3_COTAHIST', {
      acquire: () =>
        Promise.resolve({
          kind: 'FILE',
          file: FILE,
          skipIfLoadedFor: day('2026-11-25'),
        }),
      load,
    });

    expect(load).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({
      status: 'SUCCEEDED',
      alreadyLoaded: true,
      rowsWritten: 0,
      referenceDate: '2026-11-25',
    });
    expect(isRetryable(outcome)).toBe(false);
  });

  it('loads the same file asked for another date, so the load checks decide (e.g. the file of yesterday today)', async () => {
    await run({ kind: 'FILE', file: FILE, skipIfLoadedFor: day('2026-11-25') });
    const outcome = await run(
      { kind: 'FILE', file: FILE, skipIfLoadedFor: day('2026-11-26') },
      { kind: 'NO_DATA', referenceDate: day('2026-11-26') },
    );

    expect(outcome).toMatchObject({
      status: 'NO_FILE',
      alreadyLoaded: false,
      referenceDate: '2026-11-26',
    });
  });

  it('loads a local file again even when it was loaded before (reprocess)', async () => {
    await run({ kind: 'FILE', file: FILE });
    const outcome = await run({ kind: 'FILE', file: FILE });

    expect(outcome.alreadyLoaded).toBe(false);
    expect(outcome.rowsWritten).toBe(7);
  });

  it.each([
    ['the download', new Error('fetch failed'), LOADED],
    [
      'the load',
      { kind: 'FILE', file: FILE } as const,
      new Error('parse error'),
    ],
  ])(
    'records FAILED with the error when %s fails, never throwing',
    async (_case, acquired, loaded) => {
      const outcome = await run(acquired, loaded);

      expect(outcome.status).toBe('FAILED');
      expect(outcome.error).toMatch(/fetch failed|parse error/);
      expect(runs.runs[0].end).toMatchObject({ status: 'FAILED' });
      expect(locks.released).toBe(1);
    },
  );

  it('records a thrown non-Error as text', async () => {
    const outcome = await runner.run('B3_COTAHIST', {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- a non-Error rejection is the case under test
      acquire: () => Promise.reject('boom'),
      load: () => Promise.resolve(LOADED),
    });

    expect(outcome.error).toBe('boom');
  });

  it.each([
    ['an Error without message', new TypeError(''), 'TypeError'],
    ['an empty text', '', 'Unknown error'],
  ])('never records an empty error: %s', async (_case, thrown, text) => {
    const outcome = await runner.run('B3_COTAHIST', {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- non-Error rejections are under test
      acquire: () => Promise.reject(thrown),
      load: () => Promise.resolve(LOADED),
    });

    expect(outcome.error).toBe(text);
    expect(runs.runs[0].end).toMatchObject({ status: 'FAILED', error: text });
  });

  it('answers BUSY without recording a run when another process holds the lock', async () => {
    locks.busy.add('B3_COTAHIST');

    const outcome = await run({ kind: 'FILE', file: FILE });

    expect(outcome.status).toBe('BUSY');
    expect(runs.runs).toEqual([]);
    expect(isRetryable(outcome)).toBe(true);
  });

  it('releases the lock even when the run cannot be recorded', async () => {
    jest.spyOn(runs, 'start').mockRejectedValue(new Error('database down'));

    await expect(run({ kind: 'FILE', file: FILE })).rejects.toThrow(
      'database down',
    );
    expect(locks.released).toBe(1);
  });
});
