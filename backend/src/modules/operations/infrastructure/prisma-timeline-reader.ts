import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { TimelineOperation } from '../domain/timeline';
import {
  PortfolioAssetTimeline,
  TimelineReader,
} from '../domain/timeline-reader';
import { OPERATION_FIELDS, toStoredOperation } from './operation-rows';

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
      group.items.push(toStoredOperation(row).operation);
    }
    return [...groups.values()];
  }
}
