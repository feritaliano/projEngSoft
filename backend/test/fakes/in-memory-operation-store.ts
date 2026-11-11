import type { PortfolioId } from '../../src/modules/portfolios/domain/portfolio';
import {
  draftAsTimelineItem,
  OperationDraft,
  OperationId,
  StoredOperation,
} from '../../src/modules/operations/domain/operation';
import {
  OperationReads,
  OperationStore,
  OperationWrites,
} from '../../src/modules/operations/domain/operation-store';
import type { PortfolioAssetTimeline } from '../../src/modules/operations/domain/timeline-reader';

export interface StoredRow extends StoredOperation {
  readonly portfolioId: string;
}

/**
 * In-memory operations table for unit tests of the use cases: a write works on a copy and commits it only if the work
 * resolves (rollback otherwise), and every call is recorded so tests can check the lock order.
 */
export class InMemoryOperationStore extends OperationStore {
  rows: StoredRow[] = [];
  readonly portfolios = new Set<string>();
  readonly calls: string[] = [];
  private nextSequence = 1n;
  private nextId = 1;

  add(portfolioId: string, assetId: string, draft: OperationDraft): StoredRow {
    const row = this.newRow(portfolioId, assetId, draft);
    this.rows.push(row);
    return row;
  }

  write<T>(work: (tx: OperationWrites) => Promise<T>): Promise<T> {
    const tx = new Transaction(this, [...this.rows]);
    return work(tx).then((result) => {
      this.rows = tx.rows;
      return result;
    });
  }

  read<T>(work: (tx: OperationReads) => Promise<T>): Promise<T> {
    this.calls.push('read');
    return work(new Transaction(this, [...this.rows]));
  }

  newRow(
    portfolioId: string,
    assetId: string,
    draft: OperationDraft,
    id?: string,
    sequence?: bigint,
  ): StoredRow {
    const operationId =
      id ??
      `00000000-0000-4000-8000-${(this.nextId++).toString().padStart(12, '0')}`;
    return {
      portfolioId,
      assetId,
      operation: draftAsTimelineItem(
        draft,
        operationId,
        sequence ?? this.nextSequence++,
      ),
    };
  }
}

class Transaction implements OperationWrites {
  constructor(
    private readonly store: InMemoryOperationStore,
    public rows: StoredRow[],
  ) {}

  private find(
    portfolioId: string,
    operationId: string,
  ): StoredRow | undefined {
    return this.rows.find(
      (row) =>
        row.portfolioId === portfolioId && row.operation.id === operationId,
    );
  }

  findOperation(
    portfolioId: PortfolioId,
    operationId: OperationId,
  ): Promise<StoredOperation | null> {
    this.store.calls.push(`find:${operationId}`);
    return Promise.resolve(this.find(portfolioId, operationId) ?? null);
  }

  timelineOf(
    portfolioId: PortfolioId,
    assetId: string,
  ): Promise<PortfolioAssetTimeline> {
    this.store.calls.push(`timeline:${assetId}`);
    return Promise.resolve({
      portfolioId,
      assetId,
      items: this.rows
        .filter(
          (row) => row.portfolioId === portfolioId && row.assetId === assetId,
        )
        .map((row) => row.operation),
    });
  }

  lockPortfolio(portfolioId: PortfolioId): Promise<boolean> {
    this.store.calls.push('lock:portfolio');
    return Promise.resolve(this.store.portfolios.has(portfolioId));
  }

  lockOperation(
    portfolioId: PortfolioId,
    operationId: OperationId,
  ): Promise<StoredOperation | null> {
    this.store.calls.push(`lock:operation:${operationId}`);
    return Promise.resolve(this.find(portfolioId, operationId) ?? null);
  }

  lockTimelines(
    _portfolioId: PortfolioId,
    assetIds: readonly string[],
  ): Promise<void> {
    this.store.calls.push(
      `lock:timelines:${[...new Set(assetIds)].sort().join(',')}`,
    );
    return Promise.resolve();
  }

  insert(
    portfolioId: PortfolioId,
    draft: OperationDraft,
  ): Promise<StoredOperation> {
    this.store.calls.push('insert');
    const row = this.store.newRow(portfolioId, draft.assetId, draft);
    this.rows.push(row);
    return Promise.resolve(row);
  }

  update(
    operationId: OperationId,
    draft: OperationDraft,
  ): Promise<StoredOperation> {
    this.store.calls.push(`update:${operationId}`);
    const index = this.rows.findIndex(
      (row) => row.operation.id === operationId,
    );
    const current = this.rows[index];
    const row = this.store.newRow(
      current.portfolioId,
      draft.assetId,
      draft,
      operationId,
      current.operation.sequence,
    );
    this.rows[index] = row;
    return Promise.resolve(row);
  }

  delete(operationId: OperationId): Promise<void> {
    this.store.calls.push(`delete:${operationId}`);
    this.rows = this.rows.filter((row) => row.operation.id !== operationId);
    return Promise.resolve();
  }
}
