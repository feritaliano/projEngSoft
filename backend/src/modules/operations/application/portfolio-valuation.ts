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
import { calculatePosition, PositionStep } from '../domain/position-calculator';
import { positionLine, portfolioTotals } from '../domain/position-trace';
import { monthEndDays, portfolioDays } from '../domain/portfolio-history';
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
  /** B10 and B11, only when asked for (they read the whole history). */
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

interface AssetTrack {
  readonly assetId: string;
  readonly steps: readonly PositionStep[];
}

const NO_CLOSES: readonly ClosePoint[] = [];

/**
 * S1+ (D64): market numbers of whole portfolios from their operations (RN09), the closes of quotes up to the last close
 * date (LatestCloseDate) and the indexes, all read through the market-data ports. Ownership is the caller's: the ids
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
    const closesOf = (assetId: string) => closes.get(assetId) ?? NO_CLOSES;
    const until = closeDate?.toString() ?? null;
    const context = { asOf, brokerOf: refs.broker };

    const portfolios = new Map<string, PortfolioValue>();
    for (const portfolioId of portfolioIds) {
      const own = calculated.filter(
        ({ timeline }) => timeline.portfolioId === portfolioId,
      );
      const tracks: AssetTrack[] = own.map(({ timeline, calculation }) => ({
        assetId: timeline.assetId,
        steps: calculation.steps,
      }));
      const stepsOf = new Map(
        tracks.map((track) => [track.assetId, track.steps]),
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
        (assetId) => ({
          steps: stepsOf.get(assetId)!,
          closes: closesOf(assetId),
        }),
        until,
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
          history: this.history(tracks, closesOf, until, indexes, asOf),
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
    tracks: readonly AssetTrack[],
    closesOf: (assetId: string) => readonly ClosePoint[],
    until: string | null,
    indexes: MarketIndexes | null,
    asOf: LocalDate,
  ): NonNullable<PortfolioValue['history']> {
    const days =
      until === null
        ? []
        : portfolioDays(
            tracks.map((track) => ({
              steps: track.steps,
              closes: closesOf(track.assetId),
            })),
            until,
          );
    const firstOperation = tracks
      .flatMap((track) => track.steps.map((step) => step.item.date.toString()))
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
