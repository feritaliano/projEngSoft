import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import type { PortfolioId } from '../../portfolios/domain/portfolio';
import {
  HistoryFilter,
  HistoryPage,
  OperationHistory,
} from '../domain/operation-history';
import { OPERATION_FIELDS, toStoredOperation } from './operation-rows';

/** Query service of the history (CQRS, D25); the filters go into the query, so they hold on every page (D45). */
@Injectable()
export class PrismaOperationHistory extends OperationHistory {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(
    portfolioId: PortfolioId,
    filter: HistoryFilter,
  ): Promise<HistoryPage> {
    const where: Prisma.OperationWhereInput = {
      portfolioId,
      ...(filter.assetId !== null && { assetId: filter.assetId }),
      ...(filter.brokerId !== null && { brokerId: filter.brokerId }),
      ...(filter.assetType !== null && { asset: { type: filter.assetType } }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.operation.findMany({
        where,
        select: OPERATION_FIELDS,
        // Most recent first (frame 6): trade date, then the order of entry of the same date (RN09).
        orderBy: [{ tradeDate: 'desc' }, { sequence: 'desc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.operation.count({ where }),
    ]);
    return { items: rows.map(toStoredOperation), total };
  }
}
