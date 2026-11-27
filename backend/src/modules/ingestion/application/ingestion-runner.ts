import { Injectable, Logger } from '@nestjs/common';
import type { LocalDate } from '../../../shared/domain/local-date';
import {
  type IngestionSource,
  IngestionRuns,
  type SourceFile,
  SourceLocks,
} from '../domain/ingestion-run';

/** What a source has for the run: a file, or nothing yet (not published, or no trading that day). */
export type Acquired =
  | {
      readonly kind: 'FILE';
      readonly file: SourceFile;
      /**
       * Downloads only: a file already loaded with success for this date is not loaded again. Loaded for another date
       * (e.g. the file of yesterday still served today), it goes on to the load, whose checks end it as NO_FILE or
       * FAILED.
       */
      readonly skipIfLoadedFor?: LocalDate;
    }
  | { readonly kind: 'NO_FILE'; readonly referenceDate: LocalDate };

/** What the load did: rows of a date range, or nothing for the run's date (e.g. the IBOV file without that day). */
export type Loaded =
  | {
      readonly kind: 'LOADED';
      /** Last date of the data loaded. */
      readonly referenceDate: LocalDate;
      readonly rowsRead: number;
      readonly rowsWritten: number;
      readonly rowsRejected: number;
    }
  | { readonly kind: 'NO_DATA'; readonly referenceDate: LocalDate };

export interface RunPlan {
  readonly acquire: () => Promise<Acquired>;
  readonly load: (file: SourceFile) => Promise<Loaded>;
}

export type RunStatus = 'SUCCEEDED' | 'NO_FILE' | 'FAILED' | 'BUSY';

export interface RunOutcome {
  readonly source: IngestionSource;
  /** BUSY: another process holds the lock of the source; nothing was recorded. */
  readonly status: RunStatus;
  /** YYYY-MM-DD, for logs and command output. */
  readonly referenceDate?: string;
  readonly file?: string;
  readonly rowsRead: number;
  readonly rowsWritten: number;
  readonly rowsRejected: number;
  /** SUCCEEDED without loading: the same file had been loaded before. */
  readonly alreadyLoaded: boolean;
  readonly error?: string;
  readonly elapsedMs: number;
}

/** Text of a failure for ops.ingestion_runs.error, never empty (FAILED requires an error). */
export function errorText(error: unknown): string {
  return (
    (error instanceof Error ? error.message || error.name : String(error)) ||
    'Unknown error'
  );
}

/** NO_FILE, FAILED and BUSY are tried again later; SUCCEEDED is done. */
export function isRetryable(outcome: RunOutcome): boolean {
  return outcome.status !== 'SUCCEEDED';
}

/**
 * One execution of a source (arquitetura 6.3, BD-3): advisory lock of the source, RUNNING run (an orphan of a stopped
 * worker closed as FAILED), file, idempotency by hash, load, and the run closed as SUCCEEDED, NO_FILE or FAILED. A
 * failure of the source (network, parse, database) ends as FAILED and is returned, never thrown; only a failure to
 * take the lock or to record the run itself throws.
 */
@Injectable()
export class IngestionRunner {
  private readonly logger = new Logger(IngestionRunner.name);

  constructor(
    private readonly locks: SourceLocks,
    private readonly runs: IngestionRuns,
  ) {}

  async run(source: IngestionSource, plan: RunPlan): Promise<RunOutcome> {
    const started = performance.now();
    const outcome = ({
      referenceDate,
      ...fields
    }: Partial<Omit<RunOutcome, 'referenceDate'>> & {
      status: RunStatus;
      referenceDate?: LocalDate;
    }): RunOutcome => ({
      source,
      rowsRead: 0,
      rowsWritten: 0,
      rowsRejected: 0,
      alreadyLoaded: false,
      elapsedMs: Math.round(performance.now() - started),
      ...fields,
      ...(referenceDate && { referenceDate: referenceDate.toString() }),
    });

    const lock = await this.locks.tryAcquire(source);
    if (!lock) return outcome({ status: 'BUSY' });
    try {
      const runId = await this.runs.start(source);
      let file: SourceFile | undefined;
      try {
        const acquired = await plan.acquire();
        if (acquired.kind === 'NO_FILE') {
          await this.runs.finish(runId, {
            status: 'NO_FILE',
            referenceDate: acquired.referenceDate,
          });
          return outcome({
            status: 'NO_FILE',
            referenceDate: acquired.referenceDate,
          });
        }
        file = acquired.file;
        const skipFor = acquired.skipIfLoadedFor;
        const loadedOn =
          skipFor && (await this.runs.loadedReferenceDate(source, file.sha256));
        if (skipFor && loadedOn && loadedOn.equals(skipFor)) {
          const end = {
            status: 'SUCCEEDED',
            file,
            referenceDate: loadedOn,
            rowsRead: 0,
            rowsWritten: 0,
            rowsRejected: 0,
          } as const;
          await this.runs.finish(runId, end);
          return outcome({ ...end, file: file.name, alreadyLoaded: true });
        }
        const loaded = await plan.load(file);
        if (loaded.kind === 'NO_DATA') {
          await this.runs.finish(runId, {
            status: 'NO_FILE',
            referenceDate: loaded.referenceDate,
            file,
          });
          return outcome({
            status: 'NO_FILE',
            referenceDate: loaded.referenceDate,
            file: file.name,
          });
        }
        const { kind: _kind, ...counts } = loaded;
        await this.runs.finish(runId, { status: 'SUCCEEDED', file, ...counts });
        return outcome({ status: 'SUCCEEDED', file: file.name, ...counts });
      } catch (error) {
        this.logger.error({ err: error, source }, 'Ingestion run failed');
        const message = errorText(error);
        await this.runs.finish(runId, {
          status: 'FAILED',
          error: message,
          file,
        });
        return outcome({ status: 'FAILED', file: file?.name, error: message });
      }
    } finally {
      await lock.release();
    }
  }
}
