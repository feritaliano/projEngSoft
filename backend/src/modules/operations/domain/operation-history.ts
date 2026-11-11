import { InvalidValueError } from '../../../shared/domain/domain-error';
import { pageNumber } from '../../../shared/domain/page-number';
import { isUuid } from '../../../shared/domain/uuid';
import type { PortfolioId } from '../../portfolios/domain/portfolio';
import { AssetType, isAssetType } from './asset-type';
import type { StoredOperation } from './operation';

/** Handoff (frame 6): 50 operations per page with "Carregar mais". */
export const DEFAULT_HISTORY_PAGE_SIZE = 50;
export const MAX_HISTORY_PAGE_SIZE = 100;
/** Keeps OFFSET far below the bigint range. */
export const MAX_HISTORY_PAGE = 100_000;

/** B5, D45: filters of the history; null means "all". Applied in the query, so they hold on every page. */
export interface HistoryFilter {
  readonly assetId: string | null;
  readonly brokerId: string | null;
  readonly assetType: AssetType | null;
  readonly page: number;
  readonly pageSize: number;
}

function optionalUuid(value: string | null, field: string): string | null {
  if (value !== null && !isUuid(value)) {
    throw new InvalidValueError(field, 'INVALID_FORMAT', 'must be a UUID');
  }
  return value;
}

/** A valid history filter, whoever calls (not only the DTO): ids are uuids, assetType is a class (RN03). */
export function historyFilterOf(input: {
  assetId: string | null;
  brokerId: string | null;
  assetType: string | null;
  page: number;
  pageSize: number;
}): HistoryFilter {
  if (input.assetType !== null && !isAssetType(input.assetType)) {
    throw new InvalidValueError(
      'assetType',
      'INVALID_VALUE',
      'must be an asset type',
    );
  }
  return {
    assetId: optionalUuid(input.assetId, 'assetId'),
    brokerId: optionalUuid(input.brokerId, 'brokerId'),
    assetType: input.assetType,
    page: pageNumber(input.page, 'page', MAX_HISTORY_PAGE),
    pageSize: pageNumber(input.pageSize, 'pageSize', MAX_HISTORY_PAGE_SIZE),
  };
}

export interface HistoryPage {
  readonly items: readonly StoredOperation[];
  /** Operations matching the filter, across all pages. */
  readonly total: number;
}

/** Port: query service of the history (CQRS, D25). Most recent first: trade date, then order of entry (sequence). */
export abstract class OperationHistory {
  abstract list(
    portfolioId: PortfolioId,
    filter: HistoryFilter,
  ): Promise<HistoryPage>;
}
