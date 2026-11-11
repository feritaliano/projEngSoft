import { Injectable } from '@nestjs/common';
import { InconsistentTimelineError } from '../domain/inconsistent-timeline';
import { calculatePosition } from '../domain/position-calculator';
import { TimelineReader } from '../domain/timeline-reader';

/**
 * Number of assets with an open position (quantity > 0) in each portfolio, derived from the operations by the
 * PositionCalculator (RN09, D4): closed positions do not count. Read service exported to the portfolios module.
 */
@Injectable()
export class CountOpenPositions {
  constructor(private readonly timelines: TimelineReader) {}

  /** Every requested portfolio is in the result, with 0 when it has no open position. */
  async byPortfolio(
    portfolioIds: readonly string[],
  ): Promise<Map<string, number>> {
    const counts = new Map(portfolioIds.map((id) => [id, 0]));
    if (portfolioIds.length === 0) {
      return counts;
    }
    for (const timeline of await this.timelines.timelinesOf(portfolioIds)) {
      const calculation = calculatePosition(timeline.items);
      if (!calculation.ok) {
        throw new InconsistentTimelineError(
          timeline.portfolioId,
          timeline.assetId,
        );
      }
      if (!calculation.position.quantity.isZero()) {
        counts.set(
          timeline.portfolioId,
          (counts.get(timeline.portfolioId) ?? 0) + 1,
        );
      }
    }
    return counts;
  }
}
