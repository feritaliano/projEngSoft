import { Injectable, Logger } from '@nestjs/common';
import type { LocalDate } from '../../../shared/domain/local-date';
import { addDays, utcMidnight } from '../domain/business-days';
import {
  DAILY_SOURCES,
  type IngestionSource,
  IngestionRuns,
} from '../domain/ingestion-run';
import { IngestIndexes } from './ingest-indexes.use-case';
import { errorText, type RunOutcome } from './ingestion-runner';
import { IngestQuotes } from './ingest-quotes.use-case';

/** NO_FILE and FAILED runs older than this are deleted by the daily ingestion (ops tables are cleaned, revisão 12/11). */
export const UNSUCCESSFUL_RUNS_RETENTION_DAYS = 90;

/**
 * K6 (D64): the daily update of a trading day, by the same use cases as the commands, one source after the other. A
 * source that fails never stops the others; the caller (the worker scheduler) tries again the ones not SUCCEEDED.
 */
@Injectable()
export class DailyIngestion {
  private readonly logger = new Logger(DailyIngestion.name);

  constructor(
    private readonly quotes: IngestQuotes,
    private readonly indexes: IngestIndexes,
    private readonly runs: IngestionRuns,
  ) {}

  async run(
    day: LocalDate,
    sources: readonly IngestionSource[] = DAILY_SOURCES,
  ): Promise<RunOutcome[]> {
    const outcomes: RunOutcome[] = [];
    for (const source of sources) {
      try {
        outcomes.push(
          source === 'B3_COTAHIST'
            ? (await this.quotes.forDay(day)).outcome
            : await this.indexes.daily(source, day),
        );
      } catch (error) {
        // The run could not even be recorded (e.g. the database is down): reported as FAILED, tried again later.
        this.logger.error({ err: error, source }, 'Ingestion run not recorded');
        outcomes.push({
          source,
          status: 'FAILED',
          rowsRead: 0,
          rowsWritten: 0,
          rowsRejected: 0,
          alreadyLoaded: false,
          error: errorText(error),
          elapsedMs: 0,
        });
      }
    }
    const cutoff = addDays(day, -UNSUCCESSFUL_RUNS_RETENTION_DAYS);
    try {
      await this.runs.purgeUnsuccessfulBefore(utcMidnight(cutoff));
    } catch (error) {
      this.logger.error({ err: error }, 'Old ingestion runs not purged');
    }
    return outcomes;
  }
}
