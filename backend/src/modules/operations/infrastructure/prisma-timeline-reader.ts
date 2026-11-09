import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { InvalidValueError } from '../../../shared/domain/domain-error';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { InconsistentTimelineError } from '../application/count-open-positions';
import { TimelineOperation, timelineOperation } from '../domain/timeline';
import {
  PortfolioAssetTimeline,
  TimelineReader,
} from '../domain/timeline-reader';

const OPERATION_FIELDS = {
  id: true,
  portfolioId: true,
  assetId: true,
  brokerId: true,
  type: true,
  tradeDate: true,
  sequence: true,
  quantity: true,
  unitPrice: true,
  fees: true,
} as const;

type OperationRow = Prisma.OperationGetPayload<{
  select: typeof OPERATION_FIELDS;
}>;

/** One query for all the portfolios, grouped by (portfolio, asset) in memory. */
@Injectable()
export class PrismaTimelineReader extends TimelineReader {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async timelinesOf(
    portfolioIds: readonly string[],
  ): Promise<PortfolioAssetTimeline[]> {
    const rows = await this.prisma.operation.findMany({
      where: { portfolioId: { in: [...portfolioIds] } },
      select: OPERATION_FIELDS,
    });

    const groups = new Map<
      string,
      PortfolioAssetTimeline & { items: TimelineOperation[] }
    >();
    for (const row of rows) {
      const key = `${row.portfolioId}/${row.assetId}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          portfolioId: row.portfolioId,
          assetId: row.assetId,
          items: [],
        };
        groups.set(key, group);
      }
      group.items.push(this.toItem(row));
    }
    return [...groups.values()];
  }

  /** A stored row that breaks RN04 is a data fault, not the client's: it must not become a 400 with its field. */
  private toItem(row: OperationRow): TimelineOperation {
    try {
      return timelineOperation({
        id: row.id,
        type: row.type,
        // trade_date is a DATE: Prisma returns it at UTC midnight.
        date: row.tradeDate.toISOString().slice(0, 10),
        sequence: row.sequence,
        // toFixed, not toString: Decimal switches to exponent notation below 1e-7 (e.g. 8-place crypto quantities),
        // which the domain only accepts as plain decimals.
        quantity: row.quantity.toFixed(),
        unitPrice: row.unitPrice.toFixed(),
        fees: row.fees.toFixed(),
        brokerId: row.brokerId,
      });
    } catch (error) {
      if (error instanceof InvalidValueError) {
        throw new InconsistentTimelineError(
          row.portfolioId,
          row.assetId,
          `has an invalid operation ${row.id}: ${error.message}`,
          { cause: error },
        );
      }
      throw error;
    }
  }
}
