import type { PortfolioId } from '../../portfolios/domain/portfolio';
import type { OperationDraft, OperationId, StoredOperation } from './operation';
import type { PortfolioAssetTimeline } from './timeline-reader';

/** Reads of one transaction: an operation of a portfolio and the timeline of one (portfolio, asset), RN12. */
export interface OperationReads {
  /** Null when the operation does not exist or belongs to another portfolio. */
  findOperation(
    portfolioId: PortfolioId,
    operationId: OperationId,
  ): Promise<StoredOperation | null>;
  timelineOf(
    portfolioId: PortfolioId,
    assetId: string,
  ): Promise<PortfolioAssetTimeline>;
}

/**
 * A write transaction (RN10: validation by recalculation and the write commit together or not at all). Lock order is
 * fixed to avoid deadlocks: the portfolio, then the operation row (edit and delete), then the (portfolio, asset)
 * timelines.
 */
export interface OperationWrites extends OperationReads {
  /**
   * First call of every write: false when the portfolio no longer exists. While held, deleting the portfolio (and its
   * operations by cascade, D41) waits for this transaction, so a write never races the deletion.
   */
  lockPortfolio(portfolioId: PortfolioId): Promise<boolean>;
  /** Like findOperation, holding the row until the end of the transaction (two edits of it run one after the other). */
  lockOperation(
    portfolioId: PortfolioId,
    operationId: OperationId,
  ): Promise<StoredOperation | null>;
  /**
   * Holds the timelines of the (portfolio, asset) pairs until the end of the transaction: a concurrent command on the
   * same pair waits, then reads what this one committed. Must come before timelineOf.
   */
  lockTimelines(
    portfolioId: PortfolioId,
    assetIds: readonly string[],
  ): Promise<void>;
  /** The database gives the sequence, greater than every stored one (RN09: last of its date). */
  insert(
    portfolioId: PortfolioId,
    draft: OperationDraft,
  ): Promise<StoredOperation>;
  /** Keeps the sequence: an edit does not change the order of entry among operations of the same date. */
  update(
    operationId: OperationId,
    draft: OperationDraft,
  ): Promise<StoredOperation>;
  delete(operationId: OperationId): Promise<void>;
}

/** Port: the operations table (owned by this module, arquitetura 7.2), always inside a transaction. */
export abstract class OperationStore {
  abstract write<T>(work: (tx: OperationWrites) => Promise<T>): Promise<T>;
  /** Read-only snapshot, without locks (GET of one operation; the preview, D42). */
  abstract read<T>(work: (tx: OperationReads) => Promise<T>): Promise<T>;
}
