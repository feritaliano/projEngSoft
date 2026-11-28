import { Injectable } from '@nestjs/common';
import type { MarketDataRef } from '../../market-data/domain/market-data';
import { GetOwnedPortfolio } from '../../portfolios/application/get-owned-portfolio.use-case';
import type { MarketTotals } from '../domain/market-position';
import { PortfolioValuation } from './portfolio-valuation';

/** B7, B8: totals of a portfolio of the user, from the same rows as the positions table (D41). */
@Injectable()
export class GetPortfolioSummary {
  constructor(
    private readonly portfolios: GetOwnedPortfolio,
    private readonly valuation: PortfolioValuation,
  ) {}

  async execute(
    userId: string,
    portfolioId: string,
  ): Promise<MarketTotals & { marketData: MarketDataRef }> {
    const id = await this.portfolios.ensureOwned(userId, portfolioId);
    const { portfolios, marketData } = await this.valuation.evaluate([id]);
    return { ...portfolios.get(id)!.totals, marketData };
  }
}
