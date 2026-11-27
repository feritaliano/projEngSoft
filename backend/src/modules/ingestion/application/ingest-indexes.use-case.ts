import { Injectable } from '@nestjs/common';
import { LocalDate } from '../../../shared/domain/local-date';
import {
  type IndexPoint,
  IndexValueWriter,
  type MarketIndexCode,
  type SgsIndexCode,
} from '../../market-data/domain/market-data';
import { addDays } from '../domain/business-days';
import { parseIbovYear } from '../domain/ibov-file';
import { MarketSources, RawFiles } from '../domain/ingestion-run';
import { SourceFileError } from '../domain/instruments-file';
import { parseSgsSeries } from '../domain/sgs-series';
import {
  type Acquired,
  IngestionRunner,
  type Loaded,
  type RunOutcome,
} from './ingestion-runner';

/** Bronze folders (data/raw/<folder>/<year>/). */
export const SGS_FOLDER = 'bcb-sgs';
export const IBOV_FOLDER = 'b3-indices';
/** Days of SGS data a daily run asks for: CDI of a day is published the next one; IPCA about 10 days after the month. */
export const DAILY_CDI_WINDOW_DAYS = 30;
export const DAILY_IPCA_WINDOW_DAYS = 120;

const yearOf = (date: LocalDate) => Number(date.toString().slice(0, 4));

/**
 * K6 (D64): CDI (SGS 12) and IPCA (SGS 433) from the BCB, Ibovespa from the B3 index page, into index_values by upsert on
 * (index, date). One run per source and execution (BCB_SGS_CDI, BCB_SGS_IPCA, B3_IBOV).
 */
@Injectable()
export class IngestIndexes {
  constructor(
    private readonly runner: IngestionRunner,
    private readonly sources: MarketSources,
    private readonly raw: RawFiles,
    private readonly writer: IndexValueWriter,
  ) {}

  /**
   * SGS values between the dates; no value in the period (404) ends as NO_FILE on the last date. The same answer already
   * loaded up to `to` is not loaded again; any other answer goes to the upsert, which leaves equal values alone.
   */
  sgs(code: SgsIndexCode, from: LocalDate, to: LocalDate): Promise<RunOutcome> {
    return this.runner.run(code === 'CDI' ? 'BCB_SGS_CDI' : 'BCB_SGS_IPCA', {
      acquire: async (): Promise<Acquired> => {
        const download = await this.sources.sgsSeries(code, from, to);
        if (!download) return { kind: 'NO_FILE', referenceDate: to };
        const file = await this.raw.save(SGS_FOLDER, yearOf(to), download);
        return { kind: 'FILE', file, skipIfLoadedFor: to };
      },
      load: async (file) =>
        this.write(
          code,
          parseSgsSeries(await this.raw.readText(file, 'utf8')),
          from,
          to,
        ),
    });
  }

  /**
   * Ibovespa of one year (the B3 publishes one file per year) between the dates, downloaded or from a local CSV. With
   * `requireDay` (daily run) a file still without that day ends as NO_FILE, so the run is tried again. Never skipped by
   * hash: the file of yesterday is the same file today until the B3 adds the day; the upsert keeps it idempotent (D27).
   */
  ibov(
    from: LocalDate,
    to: LocalDate,
    options: { localFile?: string; requireDay?: boolean } = {},
  ): Promise<RunOutcome> {
    const year = yearOf(to);
    if (yearOf(from) !== year) {
      throw new RangeError(
        'The Ibovespa is loaded one year at a time: give dates of the same year',
      );
    }
    return this.runner.run('B3_IBOV', {
      acquire: async (): Promise<Acquired> => {
        if (options.localFile) {
          return { kind: 'FILE', file: await this.raw.open(options.localFile) };
        }
        const download = await this.sources.ibovYear(year);
        if (!download) return { kind: 'NO_FILE', referenceDate: to };
        return {
          kind: 'FILE',
          file: await this.raw.save(IBOV_FOLDER, year, download),
        };
      },
      load: async (file) => {
        const ibov = parseIbovYear(await this.raw.readText(file, 'latin1'));
        if (ibov.year !== year) {
          throw new SourceFileError(
            `The IBOV file is of ${ibov.year}, not of ${year}`,
          );
        }
        const last = to.toString();
        if (options.requireDay && !ibov.points.some((p) => p.date === last)) {
          return { kind: 'NO_DATA', referenceDate: to };
        }
        return this.write('IBOV', ibov.points, from, to);
      },
    });
  }

  /** The daily runs of the indexes for a trading day: recent SGS windows and the Ibovespa of the day. */
  async daily(
    source: 'BCB_SGS_CDI' | 'BCB_SGS_IPCA' | 'B3_IBOV',
    day: LocalDate,
  ): Promise<RunOutcome> {
    switch (source) {
      case 'BCB_SGS_CDI':
        return this.sgs('CDI', addDays(day, -DAILY_CDI_WINDOW_DAYS), day);
      case 'BCB_SGS_IPCA':
        return this.sgs('IPCA', addDays(day, -DAILY_IPCA_WINDOW_DAYS), day);
      case 'B3_IBOV':
        return this.ibov(LocalDate.parse(`${yearOf(day)}-01-01`), day, {
          requireDay: true,
        });
    }
  }

  private async write(
    code: MarketIndexCode,
    points: readonly IndexPoint[],
    from: LocalDate,
    to: LocalDate,
  ): Promise<Loaded> {
    const [first, last] = [from.toString(), to.toString()];
    const inPeriod = points.filter((p) => p.date >= first && p.date <= last);
    if (inPeriod.length === 0) return { kind: 'NO_DATA', referenceDate: to };
    return {
      kind: 'LOADED',
      referenceDate: LocalDate.parse(
        inPeriod.reduce((max, p) => (p.date > max ? p.date : max), first),
      ),
      rowsRead: inPeriod.length,
      rowsWritten: await this.writer.upsert(code, inPeriod),
      rowsRejected: 0,
    };
  }
}
