import { Injectable } from '@nestjs/common';
import { CountOpenPositions } from '../../operations/application/count-open-positions';
import {
  parsePortfolioId,
  PortfolioId,
  PortfolioNotFoundError,
  PortfolioRepository,
} from '../domain/portfolio';
import { PortfolioSummary, summarize } from './portfolio-summary';

/**
 * RN02: a portfolio of the user. Another user's, a missing one and a malformed id are all PortfolioNotFoundError.
 * Exported for the operations module (K4), which checks ownership before touching a portfolio.
 */
@Injectable()
export class GetOwnedPortfolio {
  constructor(
    private readonly portfolios: PortfolioRepository,
    private readonly openPositions: CountOpenPositions,
  ) {}

  async execute(
    userId: string,
    portfolioId: string,
  ): Promise<PortfolioSummary> {
    const id = parsePortfolioId(portfolioId);
    const portfolio = id ? await this.portfolios.findOwned(userId, id) : null;
    if (!portfolio) {
      throw new PortfolioNotFoundError();
    }
    const [summary] = await summarize([portfolio], this.openPositions);
    return summary;
  }

  /**
   * RN02 without the counts: the id of a portfolio of the user, for modules that act on it (operations, K4). Same
   * PortfolioNotFoundError as execute for another user's, a missing one and a malformed id.
   */
  async ensureOwned(userId: string, portfolioId: string): Promise<PortfolioId> {
    const id = parsePortfolioId(portfolioId);
    if (!id || !(await this.portfolios.existsOwned(userId, id))) {
      throw new PortfolioNotFoundError();
    }
    return id;
  }
}
