import { Injectable } from '@nestjs/common';
import { GetOwnedPortfolio } from '../../portfolios/application/get-owned-portfolio.use-case';
import type { MarketPositionLine } from '../domain/market-position';
import { PortfolioValuation } from './portfolio-valuation';

/**
 * B6, B8, D41: open and closed positions of a portfolio of the user, derived from its timeline (RN09, D4), brokers summed
 * (RN12), with the market numbers of the last close (D64). Ordered as D63, by market value.
 */
@Injectable()
export class ListPositions {
  constructor(
    private readonly portfolios: GetOwnedPortfolio,
    private readonly valuation: PortfolioValuation,
  ) {}

  async execute(
    userId: string,
    portfolioId: string,
  ): Promise<MarketPositionLine[]> {
    const id = await this.portfolios.ensureOwned(userId, portfolioId);
    const { portfolios } = await this.valuation.evaluate([id]);
    return portfolios.get(id)!.lines;
  }
}
