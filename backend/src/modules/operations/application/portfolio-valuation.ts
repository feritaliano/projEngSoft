import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/domain/clock';
import type { LocalDate } from '../../../shared/domain/local-date';
import {
  ClosePoint,
  IndexValueReader,
  LatestCloseDate,
  MarketDataRef,
  QuoteReader,
} from '../../market-data/domain/market-data';
import { InconsistentTimelineError } from '../domain/inconsistent-timeline';
import {
  marketAllocation,
  MarketPositionLine,
  marketPositions,
  MarketTotals,
  marketTotals,
  PortfolioAllocation,
} from '../domain/market-position';
import { calculatePosition } from '../domain/position-calculator';
import { positionLine, portfolioTotals } from '../domain/position-trace';
import {
  AssetHistory,
  monthEndDays,
  portfolioDays,
} from '../domain/portfolio-history';
import {
  MarketIndexes,
  PortfolioPerformance,
  portfolioPerformance,
} from '../domain/portfolio-returns';
import { TimelineReader } from '../domain/timeline-reader';
import { OperationDetails } from './operation-details';

/** A point of B11: equity and invested value on the last evaluation day of a month (decimal strings, RN11). */
export interface EvolutionPoint {
  readonly date: string;
  readonly equity: string;
  readonly invested: string;
}

/** The market numbers of one portfolio, computed on read (D4, D17). */
export interface PortfolioValue {
  /** B6 and B8, in the order of D63. */
  readonly lines: MarketPositionLine[];
  /** B7 and B8. */
  readonly totals: MarketTotals;
  /** B9. */
  readonly allocation: PortfolioAllocation;
  /** B10 and B11, only when asked for: they walk every evaluation day and read the indexes. */
  readonly history?: {
    readonly performance: PortfolioPerformance;
    readonly evolution: EvolutionPoint[];
  };
}

export interface PortfolioValuations {
  /** Today in São Paulo (D54): the asOf of every number. */
  readonly asOf: LocalDate;
  /** Date and source of the close every number used (D27). */
  readonly marketData: MarketDataRef;
  /** One entry per requested portfolio, an empty one without operations. */
  readonly portfolios: ReadonlyMap<string, PortfolioValue>;
}

const NO_CLOSES: readonly ClosePoint[] = [];

/**
 * S1+ (D64): market numbers of whole portfolios from their operations (RN09), the closes of quotes up to the last close
 * date and the indexes, all read through the market-data ports. Ownership is the caller's: the ids
 * must be portfolios of the user. Read service exported to the portfolios module (GET /portfolios, totals).
 */
@Injectable()
export class PortfolioValuation {
  constructor(
    private readonly timelines: TimelineReader,
    private readonly details: OperationDetails,
    private readonly quotes: QuoteReader,
    private readonly indexes: IndexValueReader,
    private readonly latestClose: LatestCloseDate,
    private readonly clock: Clock,
  ) {}

  async evaluate(
    portfolioIds: readonly string[],
    options: { history: boolean } = { history: false },
  ): Promise<PortfolioValuations> {
    const asOf = this.clock.today();
    const closeDate = await this.latestClose.get();
    const previousCloseDate = closeDate
      ? await this.latestClose.before(closeDate)
      : null;
    const timelines =
      portfolioIds.length > 0
        ? await this.timelines.timelinesOf(portfolioIds)
        : [];
    const calculated = timelines.map((timeline) => {
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
    });
    const assetIds = timelines.map((timeline) => timeline.assetId);
    const [refs, closes, indexes] = await Promise.all([
      this.details.refsOf(
        timelines.flatMap((timeline) =>
          timeline.items.flatMap((item) =>
            item.kind === 'operation'
              ? [{ assetId: timeline.assetId, brokerId: item.brokerId }]
              : [],
          ),
        ),
      ),
      closeDate
        ? this.quotes.closesUntil(assetIds, closeDate)
        : new Map<string, readonly ClosePoint[]>(),
      options.history && closeDate ? this.indexesUntil(closeDate) : null,
    ]);
    const until = closeDate?.toString() ?? null;
    const closing = until
      ? {
          closeDate: until,
          previousCloseDate: previousCloseDate?.toString() ?? null,
        }
      : null;
    const context = { asOf, brokerOf: refs.broker };

    const portfolios = new Map<string, PortfolioValue>();
    for (const portfolioId of portfolioIds) {
      const own = calculated.filter(
        ({ timeline }) => timeline.portfolioId === portfolioId,
      );
      const assets = new Map(
        own.map(({ timeline, calculation }): [string, AssetHistory] => [
          timeline.assetId,
          {
            steps: calculation.steps,
            closes: closes.get(timeline.assetId) ?? NO_CLOSES,
          },
        ]),
      );
      const positions = own
        .map(({ timeline, calculation }) =>
          positionLine(
            refs.asset(timeline.assetId),
            calculation.position,
            calculation.steps,
            context,
          ),
        )
        .filter((line) => line !== null);
      const market = marketPositions(
        positions,
        (assetId) => assets.get(assetId)!,
        closing,
        asOf,
      );
      portfolios.set(portfolioId, {
        lines: market.lines,
        totals: marketTotals(
          portfolioTotals(market.lines, asOf),
          market.equity,
          asOf,
        ),
        allocation: marketAllocation(
          market.lines,
          market.equity,
          refs.sector,
          asOf,
        ),
        ...(options.history && {
          history: this.history([...assets.values()], until, indexes, asOf),
        }),
      });
    }
    return {
      asOf,
      marketData: { source: 'B3_COTAHIST', closeDate: until },
      portfolios,
    };
  }

  private history(
    assets: readonly AssetHistory[],
    until: string | null,
    indexes: MarketIndexes | null,
    asOf: LocalDate,
  ): NonNullable<PortfolioValue['history']> {
    const days = until === null ? [] : portfolioDays(assets, until);
    const firstOperation = assets
      .flatMap((asset) => asset.steps.map((step) => step.item.date.toString()))
      .sort()[0];
    return {
      performance: portfolioPerformance(
        days,
        indexes ?? { cdi: [], ipca: [], ibov: [] },
        asOf,
        firstOperation ?? null,
      ),
      evolution: monthEndDays(days).map((day) => ({
        date: day.date,
        equity: day.equity.toFixed(),
        invested: day.invested.toFixed(),
      })),
    };
  }

  private async indexesUntil(until: LocalDate): Promise<MarketIndexes> {
    const [cdi, ipca, ibov] = await Promise.all([
      this.indexes.valuesUntil('CDI', until),
      this.indexes.valuesUntil('IPCA', until),
      this.indexes.valuesUntil('IBOV', until),
    ]);
    return { cdi, ipca, ibov };
  }
}
