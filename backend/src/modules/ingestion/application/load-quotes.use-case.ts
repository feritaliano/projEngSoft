import { Injectable } from '@nestjs/common';
import {
  type QuoteRow,
  QuoteWriter,
} from '../../market-data/domain/market-data';
import {
  cotahistHeaderDate,
  isCotahistTrailer,
  parseCotahistQuote,
  quoteProblem,
} from '../domain/cotahist-file';
import { SourceFileError } from '../domain/instruments-file';

/** Quotes per transaction: an annual file has about 400 thousand quotes of catalog assets. */
export const QUOTES_BATCH_SIZE = 5000;
const REJECTED_EXAMPLES = 10;

export interface RejectedQuote {
  readonly ticker: string;
  readonly date: string;
  readonly reason: string;
}

export interface QuotesLoadReport {
  /** Day in the header: the trading day of a daily file. */
  readonly headerDate: string;
  readonly firstDate: string | null;
  readonly lastDate: string | null;
  /** Quotes of the cash market (TPMERC 010) in the file. */
  readonly read: number;
  /** Quotes inserted or changed; an equal quote is not touched. */
  readonly written: number;
  /** Tickers that are not in the catalog: counted and ignored. */
  readonly outsideCatalog: number;
  /** Catalog tickers with another ISIN, or prices the quotes CHECKs refuse. */
  readonly rejected: number;
  readonly rejectedExamples: readonly RejectedQuote[];
}

/**
 * K6 (D64): loads the cash-market quotes of a COTAHIST (daily or annual) into quotes, only for catalog assets, by
 * upsert on (asset, date). Running it again with the same file changes nothing (D27). No deactivation of assets that
 * left the file (S2).
 */
@Injectable()
export class LoadQuotes {
  constructor(private readonly writer: QuoteWriter) {}

  /** With `tradingDay`, a file whose header has another day is refused before anything is written. */
  async execute(
    lines: AsyncIterable<string>,
    tradingDay?: string,
  ): Promise<QuotesLoadReport> {
    const assets = await this.writer.quotedAssets();
    let headerDate: string | undefined;
    let hasTrailer = false;
    let firstDate: string | null = null;
    let lastDate: string | null = null;
    let read = 0;
    let written = 0;
    let outsideCatalog = 0;
    let rejected = 0;
    const rejectedExamples: RejectedQuote[] = [];
    // By (asset, date): a repeated quote in one batch would make the upsert touch a row twice.
    const batch = new Map<string, QuoteRow>();
    const flush = async () => {
      if (batch.size === 0) return;
      written += await this.writer.upsert([...batch.values()]);
      batch.clear();
    };

    for await (const line of lines) {
      if (headerDate === undefined) {
        headerDate = cotahistHeaderDate(line);
        if (tradingDay !== undefined && headerDate !== tradingDay) {
          throw new SourceFileError(
            `The COTAHIST of ${tradingDay} has the header of ${headerDate}`,
          );
        }
        continue;
      }
      if (isCotahistTrailer(line)) {
        hasTrailer = true;
        continue;
      }
      const quote = parseCotahistQuote(line);
      if (!quote) continue;
      read++;
      const asset = assets.get(quote.ticker);
      if (!asset) {
        outsideCatalog++;
        continue;
      }
      const reason =
        asset.isin === quote.isin
          ? quoteProblem(quote)
          : `ISIN ${quote.isin} is not the catalog's ${asset.isin ?? '(none)'}`;
      if (reason) {
        rejected++;
        if (rejectedExamples.length < REJECTED_EXAMPLES) {
          rejectedExamples.push({
            ticker: quote.ticker,
            date: quote.date,
            reason,
          });
        }
        continue;
      }
      if (firstDate === null || quote.date < firstDate) firstDate = quote.date;
      if (lastDate === null || quote.date > lastDate) lastDate = quote.date;
      const { ticker: _ticker, isin: _isin, ...values } = quote;
      batch.set(`${asset.assetId}|${quote.date}`, {
        assetId: asset.assetId,
        ...values,
      });
      if (batch.size >= QUOTES_BATCH_SIZE) await flush();
    }
    if (headerDate === undefined) {
      throw new SourceFileError('The COTAHIST file is empty');
    }
    if (!hasTrailer) {
      // Batches before the cut are already written: they are real quotes, and loading the whole file again is safe.
      throw new SourceFileError(
        'The COTAHIST file has no 99COTAHIST trailer: it is truncated',
      );
    }
    await flush();
    return {
      headerDate,
      firstDate,
      lastDate,
      read,
      written,
      outsideCatalog,
      rejected,
      rejectedExamples,
    };
  }
}
