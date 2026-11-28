import { Injectable } from '@nestjs/common';
import type { MarketDataRef } from '../../market-data/domain/market-data';
import { GetOwnedPortfolio } from '../../portfolios/application/get-owned-portfolio.use-case';
import type { PortfolioAllocation } from '../domain/market-position';
import { PortfolioValuation } from './portfolio-valuation';

/** B9: allocation of a portfolio of the user by class and by sector, over its equity. */
@Injectable()
export class GetPortfolioAllocation {
  constructor(
    private readonly portfolios: GetOwnedPortfolio,
    private readonly valuation: PortfolioValuation,
  ) {}

  async execute(
    userId: string,
    portfolioId: string,
  ): Promise<PortfolioAllocation & { marketData: MarketDataRef }> {
    const id = await this.portfolios.ensureOwned(userId, portfolioId);
    const { portfolios, marketData } = await this.valuation.evaluate([id]);
    return { ...portfolios.get(id)!.allocation, marketData };
  }
}
