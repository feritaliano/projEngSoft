import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/domain/clock';
import type { LocalDate } from '../../../shared/domain/local-date';
import { GetOwnedPortfolio } from '../../portfolios/application/get-owned-portfolio.use-case';
import { ASSET_TYPES } from '../domain/asset-type';
import { InconsistentTimelineError } from '../domain/inconsistent-timeline';
import { calculatePosition } from '../domain/position-calculator';
import { PositionLine, positionLine } from '../domain/position-trace';
import { TimelineReader } from '../domain/timeline-reader';
import { OperationDetails } from './operation-details';

function byClassThenName(a: PositionLine, b: PositionLine): number {
  return (
    ASSET_TYPES.indexOf(a.asset.assetType) -
      ASSET_TYPES.indexOf(b.asset.assetType) ||
    a.asset.displayName.localeCompare(b.asset.displayName, 'pt-BR')
  );
}

/**
 * B6, D41: open and closed positions of a portfolio of the user, derived from its timeline (RN09, D4), brokers summed
 * (RN12). Ordered by asset class, then display name.
 */
@Injectable()
export class ListPositions {
  constructor(
    private readonly portfolios: GetOwnedPortfolio,
    private readonly timelines: TimelineReader,
    private readonly details: OperationDetails,
    private readonly clock: Clock,
  ) {}

  /** `asOf` defaults to today in São Paulo (D54); the summary passes its own, so rows and totals share one date. */
  async execute(
    userId: string,
    portfolioId: string,
    asOf: LocalDate = this.clock.today(),
  ): Promise<PositionLine[]> {
    const owned = await this.portfolios.ensureOwned(userId, portfolioId);
    const calculated = (await this.timelines.timelinesOf([owned])).map(
      (timeline) => {
        const calculation = calculatePosition(timeline.items);
        if (!calculation.ok) {
          throw new InconsistentTimelineError(
            timeline.portfolioId,
            timeline.assetId,
            'goes negative',
            { cause: calculation.error },
          );
        }
        return { timeline, calculation };
      },
    );
    const refs = await this.details.refsOf(
      calculated.flatMap(({ timeline }) =>
        timeline.items.flatMap((item) =>
          item.kind === 'operation'
            ? [{ assetId: timeline.assetId, brokerId: item.brokerId }]
            : [],
        ),
      ),
    );
    const context = { asOf, brokerOf: refs.broker };
    return calculated
      .map(({ timeline, calculation }) =>
        positionLine(
          refs.asset(timeline.assetId),
          calculation.position,
          calculation.steps,
          context,
        ),
      )
      .filter((line) => line !== null)
      .sort(byClassThenName);
  }
}
