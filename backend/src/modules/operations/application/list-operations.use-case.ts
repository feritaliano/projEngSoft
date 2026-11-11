import { Injectable } from '@nestjs/common';
import { GetOwnedPortfolio } from '../../portfolios/application/get-owned-portfolio.use-case';
import { historyFilterOf, OperationHistory } from '../domain/operation-history';
import { OperationDetails, OperationView } from './operation-details';

export interface HistoryQuery {
  readonly assetId: string | null;
  readonly brokerId: string | null;
  readonly assetType: string | null;
  readonly page: number;
  readonly pageSize: number;
}

export interface OperationPage {
  readonly items: OperationView[];
  readonly total: number;
}

/** B5, D45: history of a portfolio of the user, most recent first, filtered by asset, broker and asset class. */
@Injectable()
export class ListOperations {
  constructor(
    private readonly portfolios: GetOwnedPortfolio,
    private readonly history: OperationHistory,
    private readonly details: OperationDetails,
  ) {}

  async execute(
    userId: string,
    portfolioId: string,
    query: HistoryQuery,
  ): Promise<OperationPage> {
    const owned = await this.portfolios.ensureOwned(userId, portfolioId);
    const page = await this.history.list(owned, historyFilterOf(query));
    return {
      items: await this.details.views(page.items),
      total: page.total,
    };
  }
}
