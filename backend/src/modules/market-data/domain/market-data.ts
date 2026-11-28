import type { LocalDate } from '../../../shared/domain/local-date';

/** Where a market number comes from (D27, D59): B3 COTAHIST closes, BCB SGS (CDI, IPCA), B3 index history (IBOV). */
export const MARKET_DATA_SOURCES = [
  'B3_COTAHIST',
  'BCB_SGS',
  'B3_INDEX',
] as const;
export type MarketDataSource = (typeof MARKET_DATA_SOURCES)[number];

/** Date and source of the close a market number used (D27): shown next to it. Null date before any quote is loaded. */
export interface MarketDataRef {
  readonly source: 'B3_COTAHIST';
  readonly closeDate: string | null;
}

/** Windows of the asset page (C2, C3), as ISO 8601 durations up to the close date; MAX = the whole history loaded. */
export const MARKET_PERIODS = [
  'P1M',
  'P6M',
  'P1Y',
  'P2Y',
  'P5Y',
  'MAX',
] as const;
export type MarketPeriod = (typeof MARKET_PERIODS)[number];

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
