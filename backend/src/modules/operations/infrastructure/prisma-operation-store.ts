import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import type { PortfolioId } from '../../portfolios/domain/portfolio';
import type {
  OperationDraft,
  OperationId,
  StoredOperation,
} from '../domain/operation';
import {
  OperationReads,
  OperationStore,
  OperationWrites,
} from '../domain/operation-store';
import type { PortfolioAssetTimeline } from '../domain/timeline-reader';
import {
  columnsOf,
  OPERATION_FIELDS,
  toStoredOperation,
} from './operation-rows';

/** Waiting for the lock of a busy (portfolio, asset) counts in the timeout; recalculating a timeline takes milliseconds. */
const WRITE_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  maxWait: 5_000,
  timeout: 15_000,
};

class PrismaOperationReads implements OperationReads {
  constructor(protected readonly tx: Prisma.TransactionClient) {}

  async findOperation(
    portfolioId: PortfolioId,
    operationId: OperationId,
  ): Promise<StoredOperation | null> {
    const row = await this.tx.operation.findFirst({
      where: { id: operationId, portfolioId },
      select: OPERATION_FIELDS,
    });
    return row ? toStoredOperation(row) : null;
  }

  async timelineOf(
    portfolioId: PortfolioId,
    assetId: string,
  ): Promise<PortfolioAssetTimeline> {
    const rows = await this.tx.operation.findMany({
      where: { portfolioId, assetId },
      select: OPERATION_FIELDS,
    });
    return {
      portfolioId,
      assetId,
      items: rows.map((row) => toStoredOperation(row).operation),
    };
  }
}

class PrismaOperationWrites
  extends PrismaOperationReads
  implements OperationWrites
{
  // FOR KEY SHARE does not block other writes of operations of the portfolio (their foreign keys take the same lock),
  // only the deletion of the portfolio.
  async lockPortfolio(portfolioId: PortfolioId): Promise<boolean> {
    const rows = await this.tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM portfolios WHERE id = ${portfolioId}::uuid FOR KEY SHARE`;
    return rows.length === 1;
  }

  async lockOperation(
    portfolioId: PortfolioId,
    operationId: OperationId,
  ): Promise<StoredOperation | null> {
    const rows = await this.tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM operations
      WHERE id = ${operationId}::uuid AND portfolio_id = ${portfolioId}::uuid
      FOR UPDATE`;
    return rows.length === 1
      ? this.findOperation(portfolioId, operationId)
      : null;
  }

  /**
   * Transaction-level advisory lock per (portfolio, asset), released at commit or rollback. The 64-bit key is a hash of
   * the pair: a collision only makes two pairs wait for each other, never lets two commands of one pair run together.
   * Several pairs (an edit that moves an operation to another asset) are locked in ascending key order.
   */
  async lockTimelines(
    portfolioId: PortfolioId,
    assetIds: readonly string[],
  ): Promise<void> {
    const keys = await this.tx.$queryRaw<{ key: string }[]>`
      SELECT DISTINCT hashtextextended(${portfolioId}::text || '/' || asset_id, 0)::text AS key
      FROM unnest(${[...assetIds]}::text[]) AS asset_id`;
    const ordered = keys
      .map(({ key }) => BigInt(key))
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    for (const key of ordered) {
      await this.tx
        .$executeRaw`SELECT pg_advisory_xact_lock(${key.toString()}::bigint)`;
    }
  }

  async insert(
    portfolioId: PortfolioId,
    draft: OperationDraft,
  ): Promise<StoredOperation> {
    const row = await this.tx.operation.create({
      data: { portfolioId, ...columnsOf(draft) },
      select: OPERATION_FIELDS,
    });
    return toStoredOperation(row);
  }

  async update(
    operationId: OperationId,
    draft: OperationDraft,
  ): Promise<StoredOperation> {
    const row = await this.tx.operation.update({
      where: { id: operationId },
      data: columnsOf(draft),
      select: OPERATION_FIELDS,
    });
    return toStoredOperation(row);
  }

  async delete(operationId: OperationId): Promise<void> {
    await this.tx.operation.delete({ where: { id: operationId } });
  }
}

/** The operations table (owned by this module), always in a transaction. */
@Injectable()
export class PrismaOperationStore extends OperationStore {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  write<T>(work: (tx: OperationWrites) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      (tx) => work(new PrismaOperationWrites(tx)),
      WRITE_OPTIONS,
    );
  }

  /** One snapshot for every read (REPEATABLE READ), read-only: a preview can never write (D42). */
  read<T>(work: (tx: OperationReads) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        return work(new PrismaOperationReads(tx));
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
