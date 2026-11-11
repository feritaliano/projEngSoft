import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/domain/clock';
import { PortfolioTotals, portfolioTotals } from '../domain/position-trace';
import { ListPositions } from './list-positions.use-case';

/** B7: totals of a portfolio of the user, from the same rows as the positions table (D41). */
@Injectable()
export class GetPortfolioSummary {
  constructor(
    private readonly positions: ListPositions,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string, portfolioId: string): Promise<PortfolioTotals> {
    const asOf = this.clock.today();
    return portfolioTotals(
      await this.positions.execute(userId, portfolioId, asOf),
      asOf,
    );
  }
}
