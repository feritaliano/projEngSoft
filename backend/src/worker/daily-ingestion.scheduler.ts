import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import type { WorkerEnv } from '../config/env';
import { DailyIngestion } from '../modules/ingestion/application/daily-ingestion.use-case';
import { isRetryable } from '../modules/ingestion/application/ingestion-runner';
import {
  type DailyTime,
  nextDailyRun,
  parseDailyTime,
  previousDailyRun,
} from '../modules/ingestion/domain/business-days';
import {
  DAILY_SOURCES,
  type IngestionSource,
} from '../modules/ingestion/domain/ingestion-run';
import { BUSINESS_TIME_ZONE, Clock } from '../shared/domain/clock';
import type { LocalDate } from '../shared/domain/local-date';

export const DAILY_TIMEOUT = 'ingestion-daily';
export const RETRY_TIMEOUT = 'ingestion-retry';

/**
 * K6 (D64): the daily ingestion in the worker, every weekday at INGESTION_DAILY_TIME (São Paulo), after the B3 publishes
 * the daily COTAHIST; each run also recovers the trading days missed since the last close (D64c). A worker started after
 * that time catches up the weekday it missed at once, when the quotes stop before it. Sources whose last run ends
 * without SUCCEEDED (file not published, holiday, network) are tried again every INGESTION_RETRY_INTERVAL_MINUTES, up to
 * INGESTION_MAX_ATTEMPTS, for the same trading day; the last quote stays as it is. Nothing here throws into the event
 * loop, so the worker never stops because of a source.
 *
 * Timeouts of @nestjs/schedule's registry instead of @Cron: the time comes from the validated env, and a dynamic cron job
 * would need the `cron` package as a direct dependency. The registry clears them when the worker shuts down.
 */
@Injectable()
export class DailyIngestionScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(DailyIngestionScheduler.name);
  private readonly time: DailyTime;
  private readonly retryMs: number;
  private readonly maxAttempts: number;

  constructor(
    private readonly registry: SchedulerRegistry,
    private readonly daily: DailyIngestion,
    private readonly clock: Clock,
    config: ConfigService<WorkerEnv, true>,
  ) {
    this.time = parseDailyTime(
      config.get('INGESTION_DAILY_TIME', { infer: true }),
    );
    this.retryMs =
      config.get('INGESTION_RETRY_INTERVAL_MINUTES', { infer: true }) * 60_000;
    this.maxAttempts = config.get('INGESTION_MAX_ATTEMPTS', { infer: true });
  }

  onApplicationBootstrap(): void {
    this.scheduleNextDay();
    // Only days whose file should be out already: never today before the time (no NO_FILE noise).
    const missed = previousDailyRun(
      this.clock.now(),
      this.time,
      BUSINESS_TIME_ZONE,
    );
    this.setTimeout(RETRY_TIMEOUT, 0, async () => {
      if (await this.daily.isBehind(missed)) {
        await this.attempt(missed, undefined, 1);
      }
    });
  }

  private scheduleNextDay(): void {
    const now = this.clock.now();
    const next = nextDailyRun(now, this.time, BUSINESS_TIME_ZONE);
    this.logger.log(
      { day: next.day, at: next.at.toISOString() },
      'Next daily ingestion',
    );
    this.setTimeout(DAILY_TIMEOUT, next.at.getTime() - now.getTime(), () => {
      // A new trading day replaces the retries of the previous one; its run catches up what they missed (D64c).
      this.clear(RETRY_TIMEOUT);
      // Started before scheduling the next day, so a failure there never costs today's run.
      const run = this.attempt(next.day, undefined, 1);
      this.scheduleNextDay();
      return run;
    });
  }

  private async attempt(
    day: LocalDate,
    sources: readonly IngestionSource[] | undefined,
    attempt: number,
  ): Promise<void> {
    let pending: IngestionSource[];
    let failed: boolean;
    try {
      const outcomes = await this.daily.run(day, sources);
      for (const outcome of outcomes) {
        const level = outcome.status === 'FAILED' ? 'error' : 'log';
        this.logger[level]({ day, attempt, ...outcome }, 'Ingestion run');
      }
      // The last run of each source decides: the quotes catch-up ends at the trading day or where it stopped.
      const last = [...new Map(outcomes.map((o) => [o.source, o])).values()];
      pending = last.filter(isRetryable).map((outcome) => outcome.source);
      failed = last.some((outcome) => outcome.status === 'FAILED');
    } catch (err) {
      // DailyIngestion reports each source; this is a bug or a crash of the whole run: try all of them again.
      this.logger.error({ err, day, attempt }, 'Daily ingestion failed');
      pending = [...(sources ?? DAILY_SOURCES)];
      failed = true;
    }
    if (pending.length === 0) return;
    if (attempt >= this.maxAttempts) {
      // A file still missing at the end of the day is expected on holidays; a failure means stale data: error.
      this.logger[failed ? 'error' : 'warn'](
        { day, sources: pending, attempt },
        'Daily ingestion gave up for the day',
      );
      return;
    }
    this.setTimeout(RETRY_TIMEOUT, this.retryMs, () =>
      this.attempt(day, pending, attempt + 1),
    );
  }

  private setTimeout(
    name: string,
    delayMs: number,
    task: () => Promise<void> | void,
  ): void {
    this.clear(name);
    const timeout = setTimeout(() => {
      this.registry.deleteTimeout(name);
      void Promise.resolve()
        .then(task)
        .catch((err: unknown) =>
          this.logger.error(
            { err, timeout: name },
            'Scheduled ingestion task failed',
          ),
        );
    }, delayMs);
    this.registry.addTimeout(name, timeout);
  }

  private clear(name: string): void {
    if (this.registry.doesExist('timeout', name))
      this.registry.deleteTimeout(name);
  }
}
