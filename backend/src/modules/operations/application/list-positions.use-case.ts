import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/domain/clock';
import { Decimal } from '../../../shared/domain/decimal';
import type { LocalDate } from '../../../shared/domain/local-date';
import { Money } from '../../../shared/domain/money';
import { GetOwnedPortfolio } from '../../portfolios/application/get-owned-portfolio.use-case';
import { ASSET_TYPES, AssetType } from '../domain/asset-type';
import { InconsistentTimelineError } from '../domain/inconsistent-timeline';
import { calculatePosition } from '../domain/position-calculator';
import { PositionLine, positionLine } from '../domain/position-trace';
import { TimelineReader } from '../domain/timeline-reader';
import { OperationDetails } from './operation-details';

/**
 * D63: open lines first, their classes by total cost descending (market value from S2 on), a tie by the fixed order of
 * ASSET_TYPES; closed lines after, by that fixed order; display name within a class.
 */
function byClassWeightThenName(
  lines: readonly PositionLine[],
): (a: PositionLine, b: PositionLine) => number {
  const classCost = new Map<AssetType, Money>();
  for (const line of lines) {
    if (line.status === 'OPEN') {
      const type = line.asset.assetType;
      classCost.set(
        type,
        (classCost.get(type) ?? Money.zero()).plus(
          Money.of(line.totalCost.value),
        ),
      );
    }
  }
  // An open line costs more than 0 (RN04), so -1 puts every closed line after the open ones.
  const costOf = (line: PositionLine) =>
    line.status === 'OPEN'
      ? classCost.get(line.asset.assetType)!.value
      : new Decimal(-1);
  return (a, b) =>
    costOf(b).comparedTo(costOf(a)) ||
    ASSET_TYPES.indexOf(a.asset.assetType) -
      ASSET_TYPES.indexOf(b.asset.assetType) ||
    a.asset.displayName.localeCompare(b.asset.displayName, 'pt-BR');
}

/**
 * B6, D41: open and closed positions of a portfolio of the user, derived from its timeline (RN09, D4), brokers summed
 * (RN12). Ordered as D63 (see byClassWeightThenName).
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
    const lines = calculated
      .map(({ timeline, calculation }) =>
        positionLine(
          refs.asset(timeline.assetId),
          calculation.position,
          calculation.steps,
          context,
        ),
      )
      .filter((line) => line !== null);
    return lines.sort(byClassWeightThenName(lines));
  }
}
