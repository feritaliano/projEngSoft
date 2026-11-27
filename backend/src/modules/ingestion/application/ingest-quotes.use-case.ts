import { Injectable } from '@nestjs/common';
import type { LocalDate } from '../../../shared/domain/local-date';
import { weekdaysBetween } from '../domain/business-days';
import { SourceFileError } from '../domain/instruments-file';
import {
  MarketSources,
  RawFiles,
  type SourceFile,
} from '../domain/ingestion-run';
import {
  IngestionRunner,
  type Loaded,
  type RunOutcome,
} from './ingestion-runner';
import { LoadQuotes, type QuotesLoadReport } from './load-quotes.use-case';

const SOURCE = 'B3_COTAHIST';
/** Bronze folder of the COTAHIST (data/raw/b3-cotahist/<year>/). */
export const COTAHIST_FOLDER = 'b3-cotahist';

export interface QuotesRun {
  readonly outcome: RunOutcome;
  /** Present when the file was read: counts outside the catalog and rejection examples for the log. */
  readonly report?: QuotesLoadReport;
}

/** K6: COTAHIST runs of B3_COTAHIST in ops.ingestion_runs, from a local file or downloaded by trading day. */
@Injectable()
export class IngestQuotes {
  constructor(
    private readonly runner: IngestionRunner,
    private readonly sources: MarketSources,
    private readonly raw: RawFiles,
    private readonly loadQuotes: LoadQuotes,
  ) {}

  /** A local COTAHIST, annual or daily, ZIP or TXT. A reprocess: loaded even if the same file was loaded before. */
  async fromFile(path: string): Promise<QuotesRun> {
    let report: QuotesLoadReport | undefined;
    const outcome = await this.runner.run(SOURCE, {
      acquire: async () => ({ kind: 'FILE', file: await this.raw.open(path) }),
      load: async (file) => {
        report = await this.read(file);
        if (report.lastDate === null) {
          throw new SourceFileError(
            'The COTAHIST has no quote of a catalog asset in the cash market',
          );
        }
        return loaded(report, report.lastDate);
      },
    });
    return { outcome, report };
  }

  /**
   * The daily COTAHIST of a trading day, downloaded to the bronze zone. Not published (404: not yet, or no trading that
   * day) ends as NO_FILE; a file already loaded ends as SUCCEEDED without loading.
   */
  async forDay(day: LocalDate): Promise<QuotesRun> {
    let report: QuotesLoadReport | undefined;
    const date = day.toString();
    const outcome = await this.runner.run(SOURCE, {
      acquire: async () => {
        const download = await this.sources.cotahistDaily(day);
        if (!download) return { kind: 'NO_FILE', referenceDate: date };
        const file = await this.raw.save(
          COTAHIST_FOLDER,
          Number(date.slice(0, 4)),
          download,
        );
        return { kind: 'FILE', file, skipIfLoaded: true };
      },
      load: async (file) => {
        report = await this.read(file, date);
        return loaded(report, date);
      },
    });
    return { outcome, report };
  }

  /** Reprocess of a period (history and plan B of the demonstration): one run per weekday, in date order. */
  async forPeriod(from: LocalDate, to: LocalDate): Promise<QuotesRun[]> {
    const runs: QuotesRun[] = [];
    for (const day of weekdaysBetween(from, to)) {
      runs.push(await this.forDay(day));
    }
    return runs;
  }

  private read(
    file: SourceFile,
    tradingDay?: string,
  ): Promise<QuotesLoadReport> {
    return this.loadQuotes.execute(this.raw.lines(file), tradingDay);
  }
}

function loaded(report: QuotesLoadReport, referenceDate: string): Loaded {
  return {
    kind: 'LOADED',
    referenceDate,
    rowsRead: report.read,
    rowsWritten: report.written,
    rowsRejected: report.rejected,
  };
}
