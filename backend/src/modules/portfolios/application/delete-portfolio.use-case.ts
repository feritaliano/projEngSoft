import { Injectable } from '@nestjs/common';
import {
  parsePortfolioId,
  PortfolioNotFoundError,
  PortfolioRepository,
} from '../domain/portfolio';

/** B1, D41: deletes a portfolio of the user and, by cascade, its operations. RN02: 404 for anyone else's. */
@Injectable()
export class DeletePortfolio {
  constructor(private readonly portfolios: PortfolioRepository) {}

  async execute(userId: string, portfolioId: string): Promise<void> {
    const id = parsePortfolioId(portfolioId);
    const deleted =
      id !== null && (await this.portfolios.deleteOwned(userId, id));
    if (!deleted) {
      throw new PortfolioNotFoundError();
    }
  }
}
