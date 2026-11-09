import type { TimelineItem } from './timeline';

/** The timeline of one asset in one portfolio (RN12: brokers of the portfolio summed), unordered. */
export interface PortfolioAssetTimeline {
  readonly portfolioId: string;
  readonly assetId: string;
  readonly items: readonly TimelineItem[];
}

/**
 * Port: reads the timelines of whole portfolios. S1 has only operations; from S2 on the corporate events of each
 * asset join the same items (D29).
 */
export abstract class TimelineReader {
  abstract timelinesOf(
    portfolioIds: readonly string[],
  ): Promise<PortfolioAssetTimeline[]>;
}
