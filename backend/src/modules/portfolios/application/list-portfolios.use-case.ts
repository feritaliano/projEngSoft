import { Injectable } from '@nestjs/common';
import { CountOpenPositions } from '../../operations/application/count-open-positions';
import { PortfolioRepository } from '../domain/portfolio';
import { PortfolioSummary, summarize } from './portfolio-summary';

/** B1: the portfolios of the user, without pagination in S1 (handoff). */
@Injectable()
export class ListPortfolios {
  constructor(
    private readonly portfolios: PortfolioRepository,
    private readonly openPositions: CountOpenPositions,
  ) {}

  async execute(userId: string): Promise<PortfolioSummary[]> {
    return summarize(
      await this.portfolios.listOwned(userId),
      this.openPositions,
    );
  }
}
