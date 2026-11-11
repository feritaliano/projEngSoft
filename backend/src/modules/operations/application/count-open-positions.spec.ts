import { buy, sell } from '../../../../test/factories/timeline.factory';
import {
  PortfolioAssetTimeline,
  TimelineReader,
} from '../domain/timeline-reader';
import { InconsistentTimelineError } from '../domain/inconsistent-timeline';
import { CountOpenPositions } from './count-open-positions';

class FakeTimelines extends TimelineReader {
  readonly requested: (readonly string[])[] = [];

  constructor(private readonly timelines: PortfolioAssetTimeline[]) {
    super();
  }

  timelinesOf(
    portfolioIds: readonly string[],
  ): Promise<PortfolioAssetTimeline[]> {
    this.requested.push(portfolioIds);
    return Promise.resolve(
      this.timelines.filter((t) => portfolioIds.includes(t.portfolioId)),
    );
  }
}

describe('CountOpenPositions (assetCount, RN09, D41)', () => {
  it('counts only assets with quantity > 0: a fully sold asset is a closed position and does not count', async () => {
    const reader = new FakeTimelines([
      {
        portfolioId: 'p1',
        assetId: 'PETR4',
        items: [
          buy('2026-01-05', '100', '30.00'),
          sell('2026-02-05', '40', '35.00'),
        ],
      },
      {
        portfolioId: 'p1',
        assetId: 'WEGE3',
        items: [
          buy('2026-01-05', '50', '40.00'),
          sell('2026-03-01', '50', '48.00'),
        ],
      },
      {
        portfolioId: 'p1',
        assetId: 'ITSA4',
        items: [buy('2026-01-06', '300', '9.87')],
      },
    ]);

    const counts = await new CountOpenPositions(reader).byPortfolio(['p1']);

    expect(counts).toEqual(new Map([['p1', 2]]));
  });

  it('answers 0 for a portfolio without operations and keeps portfolios apart', async () => {
    const reader = new FakeTimelines([
      {
        portfolioId: 'p2',
        assetId: 'BOVA11',
        items: [buy('2026-01-05', '20', '118.45')],
      },
    ]);

    const counts = await new CountOpenPositions(reader).byPortfolio([
      'p1',
      'p2',
    ]);

    expect(counts).toEqual(
      new Map([
        ['p1', 0],
        ['p2', 1],
      ]),
    );
  });

  it('counts a repurchase after selling everything as open again (RN08)', async () => {
    const reader = new FakeTimelines([
      {
        portfolioId: 'p1',
        assetId: 'PETR4',
        items: [
          buy('2026-01-05', '10', '30.00'),
          sell('2026-02-05', '10', '31.00'),
          buy('2026-03-05', '5', '29.00'),
        ],
      },
    ]);

    expect(await new CountOpenPositions(reader).byPortfolio(['p1'])).toEqual(
      new Map([['p1', 1]]),
    );
  });

  it('does not read the database for an empty list', async () => {
    const reader = new FakeTimelines([]);

    const counts = await new CountOpenPositions(reader).byPortfolio([]);

    expect(counts.size).toBe(0);
    expect(reader.requested).toHaveLength(0);
  });

  it('fails loudly on stored operations that go negative (RN10 broken outside the API)', async () => {
    const reader = new FakeTimelines([
      {
        portfolioId: 'p1',
        assetId: 'PETR4',
        items: [
          buy('2026-01-05', '10', '30.00'),
          sell('2026-02-05', '20', '31.00'),
        ],
      },
    ]);

    await expect(
      new CountOpenPositions(reader).byPortfolio(['p1']),
    ).rejects.toThrow(new InconsistentTimelineError('p1', 'PETR4'));
  });
});
