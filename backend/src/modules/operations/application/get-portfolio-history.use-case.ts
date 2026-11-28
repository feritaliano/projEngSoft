import { Injectable } from '@nestjs/common';
import type { MarketDataRef } from '../../market-data/domain/market-data';
import { GetOwnedPortfolio } from '../../portfolios/application/get-owned-portfolio.use-case';
import type { PortfolioPerformance } from '../domain/portfolio-returns';
import { EvolutionPoint, PortfolioValuation } from './portfolio-valuation';

/** B10 and B11 of a portfolio of the user: they read the same daily history (quotas, equity and invested value). */
@Injectable()
export class GetPortfolioHistory {
  constructor(
    private readonly portfolios: GetOwnedPortfolio,
    private readonly valuation: PortfolioValuation,
  ) {}

  /** B11: equity and invested value, one point per month. */
  async evolution(
    userId: string,
    portfolioId: string,
  ): Promise<{ points: EvolutionPoint[]; marketData: MarketDataRef }> {
    const { history, marketData } = await this.historyOf(userId, portfolioId);
    return { points: history.evolution, marketData };
  }

  /** B10: TWR total and of 12 months next to CDI, Ibovespa and IPCA, and the chart. */
  async performance(
    userId: string,
    portfolioId: string,
  ): Promise<PortfolioPerformance & { marketData: MarketDataRef }> {
    const { history, marketData } = await this.historyOf(userId, portfolioId);
    return { ...history.performance, marketData };
  }

  private async historyOf(userId: string, portfolioId: string) {
    const id = await this.portfolios.ensureOwned(userId, portfolioId);
    const { portfolios, marketData } = await this.valuation.evaluate([id], {
      history: true,
    });
    return { history: portfolios.get(id)!.history!, marketData };
  }
}
