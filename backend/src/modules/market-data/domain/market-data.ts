import type { LocalDate } from '../../../shared/domain/local-date';

/** A daily quote of a catalog asset (quotes table; COTAHIST, D59). Decimals as plain strings (RN11); date YYYY-MM-DD. */
export interface QuoteRow {
  readonly assetId: string;
  readonly date: string;
  readonly open: string;
  readonly high: string;
  readonly low: string;
  readonly close: string;
  readonly volume: string;
  readonly tradesCount: number;
}

/** An asset that takes quotes (STOCK, FII, ETF, BDR), found by ticker; a quote line must carry the same ISIN. */
export interface QuotedAsset {
  readonly assetId: string;
  readonly isin: string | null;
}

/** Indexes loaded by the ingestion (K6, D64): CDI and IPCA from the BCB SGS, Ibovespa from the B3. */
export type MarketIndexCode = 'CDI' | 'IPCA' | 'IBOV';
/** The indexes of the BCB SGS. */
export type SgsIndexCode = Exclude<MarketIndexCode, 'IBOV'>;

/** A value of an index on a date (index_values); YYYY-MM-DD and a plain decimal string. */
export interface IndexPoint {
  readonly date: string;
  readonly value: string;
}

/** Port: writes quotes (market-data owns the table, arquitetura 7.2). */
export abstract class QuoteWriter {
  abstract quotedAssets(): Promise<ReadonlyMap<string, QuotedAsset>>;

  /** Upsert by (asset, date) in one transaction; returns the rows inserted or changed (an equal row is not touched). */
  abstract upsert(rows: readonly QuoteRow[]): Promise<number>;
}

/** Port: writes index values by (index, date), points of distinct dates; same return as QuoteWriter.upsert. */
export abstract class IndexValueWriter {
  abstract upsert(
    code: MarketIndexCode,
    points: readonly IndexPoint[],
  ): Promise<number>;
}

/** Port: date of the last close available in quotes, for the market value of K7 and K8 (a query, no column; D4). */
export abstract class LatestCloseDate {
  abstract get(): Promise<LocalDate | null>;
}
