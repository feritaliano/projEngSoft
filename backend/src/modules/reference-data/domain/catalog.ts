import {
  DomainError,
  InvalidValueError,
} from '../../../shared/domain/domain-error';
import { pageNumber } from '../../../shared/domain/page-number';
import { AssetType } from '../../operations/domain/asset-type';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
/** Keeps OFFSET far below the bigint range: (MAX_PAGE - 1) × MAX_PAGE_SIZE. */
export const MAX_PAGE = 100_000;
export const SEARCH_TERM_MAX_LENGTH = 100;

/** C1: an asset of the catalog as the search, the detail and the operation form show it. */
export interface AssetSummary {
  readonly id: string;
  /** Null only for fixed income (D50). */
  readonly ticker: string | null;
  readonly assetType: AssetType;
  readonly displayName: string;
  /** Null for crypto (no issuer, RN03). */
  readonly issuer: string | null;
  readonly sector: string | null;
}

export interface AssetPage {
  readonly items: AssetSummary[];
  readonly total: number;
}

/** Ticker or issuer name, ignoring case and accents; null lists the whole catalog. Pages start at 1. */
export interface AssetSearch {
  readonly term: string | null;
  readonly page: number;
  readonly pageSize: number;
}

// Control characters (C0, DEL, C1): PostgreSQL rejects NUL in text parameters, so they would be a 500, not a 400.
const CONTROL_CHARACTERS = /\p{Cc}/u;

/** Tickers of the catalog (RN03): B3 format or a crypto symbol, upper case, at most 12 characters. */
const TICKER = /^[A-Z0-9]{2,12}$/;

/** True when the value can be a ticker of the catalog; anything else is "not found" without querying. */
export function isTicker(value: string): boolean {
  return TICKER.test(value);
}

/**
 * C1: a valid search: no control characters in the term, page from 1 to MAX_PAGE, pageSize from 1 to MAX_PAGE_SIZE,
 * whoever calls (not only the DTO).
 */
export function assetSearchOf(
  term: string | null,
  page: number,
  pageSize: number,
): AssetSearch {
  if (term !== null && CONTROL_CHARACTERS.test(term)) {
    throw new InvalidValueError(
      'search',
      'INVALID_VALUE',
      'must not contain control characters',
    );
  }
  return {
    term,
    page: pageNumber(page, 'page', MAX_PAGE),
    pageSize: pageNumber(pageSize, 'pageSize', MAX_PAGE_SIZE),
  };
}

export interface Broker {
  readonly id: string;
  readonly name: string;
  /** Null for a crypto exchange without CNPJ (D50). */
  readonly cnpj: string | null;
}

/** What the catalog stores about an asset; the display name is derived from it (D50, never a column). */
export interface AssetRecord {
  readonly id: string;
  readonly ticker: string | null;
  readonly assetType: AssetType;
  readonly issuer: string | null;
  readonly sector: string | null;
  readonly cryptoName: string | null;
  readonly fixedIncomeTypeName: string | null;
  /** YYYY-MM-DD. */
  readonly maturityDate: string | null;
}

/** A row that breaks the catalog shape (e.g. fixed income without its bond): a data fault, not a client error. */
export class InconsistentAssetError extends Error {
  constructor(
    readonly assetId: string,
    reason: string,
  ) {
    super(`Asset ${assetId} ${reason}`);
    this.name = 'InconsistentAssetError';
  }
}

/**
 * D50: B3 classes show the ticker; crypto, its name; fixed income, the bond type and the maturity year
 * (e.g. "Tesouro IPCA+ 2035").
 */
export function displayNameOf(asset: AssetRecord): string {
  switch (asset.assetType) {
    case 'STOCK':
    case 'FII':
    case 'ETF':
    case 'BDR':
      if (asset.ticker === null) {
        throw new InconsistentAssetError(asset.id, 'has no ticker');
      }
      return asset.ticker;
    case 'CRYPTO':
      if (asset.cryptoName === null) {
        throw new InconsistentAssetError(asset.id, 'has no crypto asset row');
      }
      return asset.cryptoName;
    case 'FIXED_INCOME':
      if (asset.fixedIncomeTypeName === null || asset.maturityDate === null) {
        throw new InconsistentAssetError(asset.id, 'has no fixed income bond');
      }
      return `${asset.fixedIncomeTypeName} ${asset.maturityDate.slice(0, 4)}`;
  }
}

export function toAssetSummary(asset: AssetRecord): AssetSummary {
  return {
    id: asset.id,
    ticker: asset.ticker,
    assetType: asset.assetType,
    displayName: displayNameOf(asset),
    issuer: asset.issuer,
    sector: asset.sector,
  };
}

export class AssetNotFoundError extends DomainError {
  readonly code = 'ASSET_NOT_FOUND';

  constructor() {
    super('Asset not found');
  }
}

/** Port: read-only catalog (S1: reference data from the seed, arquitetura 7.2). Only active assets. */
export abstract class AssetCatalog {
  /** Ordered by ticker (fixed income last). */
  abstract search(search: AssetSearch): Promise<{
    records: readonly AssetRecord[];
    total: number;
  }>;
  abstract findByTicker(ticker: string): Promise<AssetRecord | null>;
  /** Active asset by id (an operation can only be entered for one, RN04). Ids must be uuids. */
  abstract findActiveById(id: string): Promise<AssetRecord | null>;
  /** Assets by id, active or not (an asset deactivated later keeps its operations). Ids must be uuids. */
  abstract findByIds(ids: readonly string[]): Promise<AssetRecord[]>;
}

/** Port: brokers and exchanges, ordered by name. */
export abstract class BrokerCatalog {
  abstract list(): Promise<Broker[]>;
  /** Ids must be uuids. */
  abstract findByIds(ids: readonly string[]): Promise<Broker[]>;
}
