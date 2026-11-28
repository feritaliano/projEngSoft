import { Injectable, Logger } from '@nestjs/common';
import type { LocalDate } from '../../../shared/domain/local-date';
import { LatestCloseDate } from '../../market-data/domain/market-data';
import { addDays, utcMidnight, weekdaysBetween } from '../domain/business-days';
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
/** Weekdays of COTAHIST one daily run recovers at most (about 3 months); the rest by the next runs or the command. */
export const QUOTES_CATCH_UP_MAX_DAYS = 60;

/**
 * K6 (D64): the daily update of a trading day, by the same use cases as the commands, one source after the other. The
 * quotes catch up: every weekday after the last close in quotes, up to the trading day (D64c). A source that fails never
 * stops the others; the caller (the worker scheduler) tries again the ones whose last run is not SUCCEEDED.
 */
@Injectable()
export class DailyIngestion {
  private readonly logger = new Logger(DailyIngestion.name);

  constructor(
    private readonly quotes: IngestQuotes,
    private readonly indexes: IngestIndexes,
    private readonly runs: IngestionRuns,
    private readonly latestClose: LatestCloseDate,
  ) {}

  /** The runs in order, several per source when it catches up; the last run of each source is its result. */
  async run(
    day: LocalDate,
    sources: readonly IngestionSource[] = DAILY_SOURCES,
  ): Promise<RunOutcome[]> {
    const outcomes: RunOutcome[] = [];
    for (const source of sources) {
      try {
        if (source === 'B3_COTAHIST') await this.catchUpQuotes(day, outcomes);
        else outcomes.push(...(await this.indexes.daily(source, day)));
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

  /** The quotes stop before the day. Without any quote nothing is behind: the history comes from the seed or a file. */
  async isBehind(day: LocalDate): Promise<boolean> {
    const latest = await this.latestClose.get();
    return latest !== null && day.isAfter(latest);
  }

  /**
   * The weekdays after the last close up to the target, oldest first, at most QUOTES_CATCH_UP_MAX_DAYS; the target alone
   * when nothing is missing. A past day without file was a holiday and is passed; any other run that does not succeed
   * stops here, so the last close stays before it and the next run starts again from it. A daily file is one
   * transaction (fewer quotes than QUOTES_BATCH_SIZE), so a day in quotes is a day loaded whole.
   */
  private async catchUpQuotes(
    target: LocalDate,
    outcomes: RunOutcome[],
  ): Promise<void> {
    const latest = await this.latestClose.get();
    const from = latest && target.isAfter(latest) ? addDays(latest, 1) : target;
    const days = weekdaysBetween(from, target);
    if (days.length > QUOTES_CATCH_UP_MAX_DAYS) {
      this.logger.warn(
        {
          from: days[0],
          to: target,
          missing: days.length,
          max: QUOTES_CATCH_UP_MAX_DAYS,
        },
        'Quotes catch-up capped: the next runs go on, or run ingest:quotes --from --to for the rest',
      );
    }
    for (const day of days.slice(0, QUOTES_CATCH_UP_MAX_DAYS)) {
      const { outcome } = await this.quotes.forDay(day);
      // A FAILED or BUSY run has no date of its own; the log needs the day.
      outcomes.push({ referenceDate: day.toString(), ...outcome });
      const holiday = outcome.status === 'NO_FILE' && target.isAfter(day);
      if (outcome.status !== 'SUCCEEDED' && !holiday) return;
    }
  }
}
