import { Injectable } from '@nestjs/common';
import { PortfolioValuation } from '../../operations/application/portfolio-valuation';
import { PortfolioRepository } from '../domain/portfolio';
import { PortfolioSummary, summarize } from './portfolio-summary';

/** B1: the portfolios of the user, without pagination in S1 (handoff). */
@Injectable()
export class ListPortfolios {
  constructor(
    private readonly portfolios: PortfolioRepository,
    private readonly valuation: PortfolioValuation,
  ) {}

  async execute(userId: string): Promise<PortfolioSummary[]> {
    return summarize(await this.portfolios.listOwned(userId), this.valuation);
  }
}
