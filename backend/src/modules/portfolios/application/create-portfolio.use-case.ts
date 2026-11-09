import { Injectable } from '@nestjs/common';
import { PortfolioName, PortfolioRepository } from '../domain/portfolio';
import { PortfolioSummary } from './portfolio-summary';

/** B1, RN02: creates an empty portfolio; the name is trimmed and unique per user. */
@Injectable()
export class CreatePortfolio {
  constructor(private readonly portfolios: PortfolioRepository) {}

  async execute(userId: string, name: string): Promise<PortfolioSummary> {
    const portfolio = await this.portfolios.create(
      userId,
      PortfolioName.of(name),
    );
    return { ...portfolio, operationCount: 0, assetCount: 0 };
  }
}
