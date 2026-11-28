import { buy, sell, split } from '../../../../test/factories/timeline.factory';
import { Clock } from '../../../shared/domain/clock';
import { LocalDate } from '../../../shared/domain/local-date';
import { GetOwnedPortfolio } from '../../portfolios/application/get-owned-portfolio.use-case';
import { PortfolioNotFoundError } from '../../portfolios/domain/portfolio';
import {
  AssetDirectory,
  BrokerDirectory,
} from '../../reference-data/application/directories';
import type { AssetSummary, Broker } from '../../reference-data/domain/catalog';
import { InconsistentTimelineError } from '../domain/inconsistent-timeline';
import { NegativePositionError } from '../domain/position-calculator';
import type { TimelineItem } from '../domain/timeline';
import {
  PortfolioAssetTimeline,
  TimelineReader,
} from '../domain/timeline-reader';
import { GetPortfolioAllocation } from './get-portfolio-allocation.use-case';
import { GetPortfolioHistory } from './get-portfolio-history.use-case';
import { GetPortfolioSummary } from './get-portfolio-summary.use-case';
import { ListPositions } from './list-positions.use-case';
import { OperationDetails } from './operation-details';
import { PortfolioValuation } from './portfolio-valuation';

const ANA = 'user-ana';
const P1 = '3f1c2b9e-8d4a-4c6f-9b1e-2a7d5c8e0f13';
const XP = '0c9e7f3a-5b2d-4e81-a6c4-9d1f2b3e4a57';
const ID = (n: number) => `6b0d3a52-1f5e-4f0a-9d7c-3e2b8a1c4d9${n}`;

const ASSETS: AssetSummary[] = [
  ['VALE3', 'STOCK'],
  ['PETR4', 'STOCK'],
  ['MXRF11', 'FII'],
  ['Bitcoin', 'CRYPTO'],
  ['Tesouro IPCA+ 2035', 'FIXED_INCOME'],
  ['WEGE3', 'STOCK'],
  ['Ethereum', 'CRYPTO'],
].map(([displayName, assetType], index) => ({
  id: ID(index),
  ticker: assetType === 'FIXED_INCOME' ? null : displayName,
  displayName,
  assetType: assetType as AssetSummary['assetType'],
  issuer: null,
  sector: displayName === 'PETR4' ? 'Petróleo' : null,
}));
const BROKER: Broker = { id: XP, name: 'XP Investimentos', cnpj: null };

const assets = {
  byIds: (ids: readonly string[]) =>
    Promise.resolve(
      new Map(
        ASSETS.filter((asset) => ids.includes(asset.id)).map((asset) => [
          asset.id,
          asset,
        ]),
      ),
    ),
} as unknown as AssetDirectory;
const brokers = {
  byIds: () => Promise.resolve(new Map([[XP, BROKER]])),
} as unknown as BrokerDirectory;

class FixedClock extends Clock {
  now(): Date {
    // 23:30 in São Paulo on 11/11 is already 12/11 in UTC (D54).
    return new Date('2026-11-12T02:30:00Z');
  }
}

const portfolios = {
  ensureOwned: (userId: string, portfolioId: string) =>
    userId === ANA && portfolioId === P1
      ? Promise.resolve(P1)
      : Promise.reject(new PortfolioNotFoundError()),
} as unknown as GetOwnedPortfolio;

const at = { brokerId: XP };

interface Market {
  /** Closes by asset number, oldest first. */
  closes?: Record<number, [string, string][]>;
  closeDate?: string | null;
  indexes?: Partial<Record<'CDI' | 'IPCA' | 'IBOV', [string, string][]>>;
}

function setup(timelines: [number, TimelineItem[]][], market: Market = {}) {
  const reader: TimelineReader = {
    timelinesOf: jest.fn(() =>
      Promise.resolve(
        timelines.map(([asset, items]): PortfolioAssetTimeline => ({
          portfolioId: P1,
          assetId: ID(asset),
          items,
        })),
      ),
    ),
  };
  const quotes = {
    closesUntil: jest.fn((ids: readonly string[], until: LocalDate) =>
      Promise.resolve(
        new Map(
          Object.entries(market.closes ?? {})
            .filter(([asset]) => ids.includes(ID(Number(asset))))
            .map(([asset, rows]) => [
              ID(Number(asset)),
              rows
                .filter(([date]) => date <= until.toString())
                .map(([date, close]) => ({ date, close })),
            ]),
        ),
      ),
    ),
  };
  const indexes = {
    valuesUntil: jest.fn((code: 'CDI' | 'IPCA' | 'IBOV') =>
      Promise.resolve(
        (market.indexes?.[code] ?? []).map(([date, value]) => ({
          date,
          value,
        })),
      ),
    ),
  };
  const latestClose = {
    get: () =>
      Promise.resolve(
        market.closeDate ? LocalDate.parse(market.closeDate) : null,
      ),
    // The market's trading days are the dates of every close given.
    before: (date: LocalDate) => {
      const previous = Object.values(market.closes ?? {})
        .flat()
        .map(([day]) => day)
        .filter((day) => day < date.toString())
        .sort()
        .pop();
      return Promise.resolve(previous ? LocalDate.parse(previous) : null);
    },
  };
  const valuation = new PortfolioValuation(
    reader,
    new OperationDetails(assets, brokers),
    quotes,
    indexes,
    latestClose,
    new FixedClock(),
  );
  return {
    list: new ListPositions(portfolios, valuation),
    summary: new GetPortfolioSummary(portfolios, valuation),
    allocation: new GetPortfolioAllocation(portfolios, valuation),
    history: new GetPortfolioHistory(portfolios, valuation),
    reader,
    quotes,
    indexes,
  };
}

describe('ListPositions (B6, D41, RN09, RN12)', () => {
  it('returns 404 for a portfolio of another user before reading anything (RN02)', async () => {
    const { list, reader } = setup([]);

    await expect(list.execute('user-bruno', P1)).rejects.toBeInstanceOf(
      PortfolioNotFoundError,
    );
    expect(reader.timelinesOf).not.toHaveBeenCalled();
  });

  it('lists open positions by class value (at cost without quote), then display name, and closed after, leaving out closed with profit 0 (D41, D55, D63)', async () => {
    const { list } = setup([
      [3, [buy('2026-01-05', '0.0125', '350000', '0', at)]],
      [0, [buy('2026-01-05', '10', '60', '0', at)]],
      [4, [buy('2026-01-05', '0.52', '3000', '0', at)]],
      [
        5,
        [
          buy('2026-01-05', '10', '10', '0', at),
          sell('2026-02-05', '10', '10', '0', at),
        ],
      ],
      [2, [buy('2026-01-05', '100', '10', '0', at)]],
      [
        1,
        [
          buy('2026-01-05', '10', '30', '0', at),
          sell('2026-02-05', '10', '35', '0', at),
        ],
      ],
    ]);

    const lines = await list.execute(ANA, P1);

    expect(
      lines.map((line) => [line.asset.displayName, line.status, line.quantity]),
    ).toEqual([
      ['Bitcoin', 'OPEN', '0.0125'],
      ['Tesouro IPCA+ 2035', 'OPEN', '0.52'],
      ['MXRF11', 'OPEN', '100'],
      ['VALE3', 'OPEN', '10'],
      ['PETR4', 'CLOSED', '0'],
    ]);
    expect(lines[1].asset).toEqual({
      id: ID(4),
      ticker: null,
      displayName: 'Tesouro IPCA+ 2035',
      assetType: 'FIXED_INCOME',
    });
  });

  describe('order of the classes by their value, at cost without quote (D63)', () => {
    const order = async (timelines: [number, TimelineItem[]][]) =>
      (await setup(timelines).list.execute(ANA, P1)).map(
        (line) => line.asset.displayName,
      );
    const holding = (quantity: string, price: string) => [
      buy('2026-01-05', quantity, price, '0', at),
    ];
    const closed = (sellPrice: string) => [
      buy('2026-01-05', '10', '10', '0', at),
      sell('2026-02-05', '10', sellPrice, '0', at),
    ];

    it('puts the class with more value first, even if it comes later in the fixed order', async () => {
      expect(
        await order([
          [0, holding('10', '60')],
          [3, holding('0.01', '100000')],
        ]),
      ).toEqual(['Bitcoin', 'VALE3']);
    });

    it('breaks a tie of the class sums, in Decimal, by the fixed order of the classes (D5)', async () => {
      expect(
        await order([
          [0, holding('1', '0.01')],
          [3, holding('1', '0.1')],
          [6, holding('1', '0.2')],
          [2, holding('1', '0.3')],
        ]),
      ).toEqual(['MXRF11', 'Bitcoin', 'Ethereum', 'VALE3']);
    });

    it('ranks a class by the sum of its positions, not by its largest one', async () => {
      expect(
        await order([
          [0, holding('10', '100')],
          [6, holding('1', '600')],
          [3, holding('1', '600')],
        ]),
      ).toEqual(['Bitcoin', 'Ethereum', 'VALE3']);
    });

    it('lists closed positions after every open one, by class, then display name', async () => {
      expect(
        await order([
          [2, closed('12')],
          [5, closed('8')],
          [3, holding('0.0001', '100000')],
          [1, closed('15')],
          [0, holding('10', '60')],
        ]),
      ).toEqual(['VALE3', 'Bitcoin', 'PETR4', 'WEGE3', 'MXRF11']);
    });
  });

  it('dates the trace with today in São Paulo and names the broker (D54, RN12)', async () => {
    const { list } = setup([[0, [buy('2026-01-05', '10', '60', '0', at)]]]);

    const [line] = await list.execute(ANA, P1);

    expect(line.realizedProfit.asOf).toBe('2026-11-11');
    expect(line.averagePrice?.inputs[2]).toMatchObject({
      operation: { broker: { id: XP, name: 'XP Investimentos' } },
    });
  });

  it('fails as a server fault, not a smaller list, when a stored timeline goes negative, keeping the offending sell (RN10)', async () => {
    const { list } = setup([[0, [sell('2026-01-05', '10', '60', '0', at)]]]);

    const error = await list.execute(ANA, P1).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(InconsistentTimelineError);
    expect((error as Error).cause).toBeInstanceOf(NegativePositionError);
  });

  it('fails loudly for a timeline with a corporate event, which S2 will trace (D29)', async () => {
    const { list } = setup([
      [
        0,
        [buy('2026-01-05', '10', '60', '0', at), split('2026-02-01', '1', '2')],
      ],
    ]);

    await expect(list.execute(ANA, P1)).rejects.toThrow('(S2)');
  });
});

describe('GetPortfolioSummary (B7, D41)', () => {
  it('totals the rows of the positions table: realized profit equals their sum', async () => {
    const { summary, list } = setup([
      [0, [buy('2026-01-05', '10', '60', '0', at)]],
      [
        1,
        [
          buy('2026-01-05', '10', '30', '0', at),
          sell('2026-02-05', '10', '35', '1', at),
        ],
      ],
    ]);

    const totals = await summary.execute(ANA, P1);
    const lines = await list.execute(ANA, P1);

    expect(totals.assetCount).toBe(1);
    expect(totals.totalCost.value).toBe('600');
    expect(totals.realizedProfit.value).toBe('49');
    expect(totals.realizedProfit.asOf).toBe('2026-11-11');
    expect(totals.realizedProfit.inputs.map((input) => input.value)).toEqual(
      lines.map((line) => line.realizedProfit.value).filter((v) => v !== '0'),
    );
  });

  it('returns 404 for a portfolio of another user (RN02)', async () => {
    const { summary } = setup([]);

    await expect(summary.execute('user-bruno', P1)).rejects.toBeInstanceOf(
      PortfolioNotFoundError,
    );
  });
});

describe('market numbers of a portfolio (B8–B11, D64)', () => {
  // VALE3 = ID(0), PETR4 = ID(1), MXRF11 = ID(2), Bitcoin = ID(3).
  const holdings: [number, TimelineItem[]][] = [
    [1, [buy('2026-11-09', '10', '30', '0', at)]],
    [2, [buy('2026-11-09', '100', '10', '0', at)]],
    [3, [buy('2026-11-09', '0.01', '100000', '0', at)]],
  ];
  const market: Market = {
    closeDate: '2026-11-10',
    closes: {
      1: [
        ['2026-11-09', '30'],
        ['2026-11-10', '33'],
        ['2026-11-11', '99'],
      ],
      2: [
        ['2026-11-09', '10'],
        ['2026-11-10', '9'],
      ],
    },
    indexes: {
      CDI: [
        ['2026-11-09', '0.05'],
        ['2026-11-10', '0.05'],
      ],
      IBOV: [
        ['2026-11-06', '100'],
        ['2026-11-10', '110'],
      ],
    },
  };

  it('values the positions at the last close up to the close date and the crypto at cost (D55)', async () => {
    const { list, quotes } = setup(holdings, market);

    const lines = await list.execute(ANA, P1);

    expect(
      lines.map((line) => [
        line.asset.displayName,
        line.marketValue?.value,
        line.unavailableReason,
      ]),
    ).toEqual([
      ['Bitcoin', '1000', 'NO_QUOTE'],
      ['MXRF11', '900', undefined],
      ['PETR4', '330', undefined],
    ]);
    expect(quotes.closesUntil).toHaveBeenCalledWith(
      [ID(1), ID(2), ID(3)],
      LocalDate.parse('2026-11-10'),
    );
  });

  it('adds the equity, the gain over the cost and the close date to the summary (B8, D27)', async () => {
    const { summary } = setup(holdings, market);

    const totals = await summary.execute(ANA, P1);

    expect(totals.equity.value).toBe('2230');
    expect(totals.unrealizedProfit.value).toBe('-70');
    expect(totals.marketData).toEqual({
      source: 'B3_COTAHIST',
      closeDate: '2026-11-10',
    });
  });

  it('allocates by class and by the sector of the issuer (B9)', async () => {
    const { allocation } = setup(holdings, market);

    const result = await allocation.execute(ANA, P1);

    expect(result.byClass.map((group) => group.assetType)).toEqual([
      'CRYPTO',
      'FII',
      'STOCK',
    ]);
    expect(
      result.bySector.map((group) => [group.sector, group.value.value]),
    ).toEqual([
      ['Petróleo', '330'],
      [null, '1900'],
    ]);
    expect(result.marketData.closeDate).toBe('2026-11-10');
  });

  it('reads the indexes only for the history, and gives the evolution and the TWR with the benchmarks (B10, B11)', async () => {
    const { history, list, indexes } = setup(holdings, market);

    await list.execute(ANA, P1);
    expect(indexes.valuesUntil).not.toHaveBeenCalled();

    const evolution = await history.evolution(ANA, P1);
    expect(evolution.points).toEqual([
      { date: '2026-11-10', equity: '2230', invested: '2300' },
    ]);
    expect(indexes.valuesUntil).toHaveBeenCalledWith(
      'IPCA',
      LocalDate.parse('2026-11-10'),
    );

    const performance = await history.performance(ANA, P1);
    expect(performance.total).toMatchObject({
      from: '2026-11-09',
      to: '2026-11-10',
    });
    expect(performance.total?.cdi?.value).toBe('0.05');
    expect(performance.total?.ibov?.value).toBe('10');
    expect(performance.total?.ipca).toBeNull();
    expect(performance.last12MonthsUnavailableReason).toBe('SHORT_HISTORY');
    expect(performance.series.map((point) => point.date)).toEqual([
      '2026-11-10',
    ]);
    expect(performance.marketData.closeDate).toBe('2026-11-10');
  });

  it('keeps everything at cost and reads no quote before any close is loaded', async () => {
    const { list, history, quotes, indexes } = setup(holdings, {
      closeDate: null,
    });

    const lines = await list.execute(ANA, P1);
    const performance = await history.performance(ANA, P1);

    expect(lines.every((line) => line.unavailableReason === 'NO_QUOTE')).toBe(
      true,
    );
    expect(performance).toMatchObject({ total: null, series: [] });
    expect(quotes.closesUntil).not.toHaveBeenCalled();
    expect(indexes.valuesUntil).not.toHaveBeenCalled();
  });

  it.each(['allocation', 'evolution', 'performance'] as const)(
    '%s returns 404 for a portfolio of another user before reading anything (RN02)',
    async (route) => {
      const { allocation, history, reader } = setup(holdings, market);
      const call =
        route === 'allocation'
          ? allocation.execute('user-bruno', P1)
          : history[route]('user-bruno', P1);

      await expect(call).rejects.toBeInstanceOf(PortfolioNotFoundError);
      expect(reader.timelinesOf).not.toHaveBeenCalled();
    },
  );
});

describe('PortfolioValuation over several portfolios (B8)', () => {
  it('keeps each portfolio apart when they hold the same asset', async () => {
    const P2 = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
    const reader: TimelineReader = {
      timelinesOf: () =>
        Promise.resolve([
          {
            portfolioId: P1,
            assetId: ID(1),
            items: [buy('2026-11-09', '10', '30', '0', at)],
          },
          {
            portfolioId: P2,
            assetId: ID(1),
            items: [buy('2026-11-09', '100', '30', '0', at)],
          },
          {
            portfolioId: P2,
            assetId: ID(2),
            items: [buy('2026-11-09', '10', '10', '0', at)],
          },
        ]),
    };
    const closes = new Map([
      [ID(1), [{ date: '2026-11-10', close: '33' }]],
      [ID(2), [{ date: '2026-11-10', close: '9' }]],
    ]);
    const valuation = new PortfolioValuation(
      reader,
      new OperationDetails(assets, brokers),
      { closesUntil: () => Promise.resolve(closes) },
      { valuesUntil: () => Promise.resolve([]) },
      {
        get: () => Promise.resolve(LocalDate.parse('2026-11-10')),
        before: () => Promise.resolve(LocalDate.parse('2026-11-09')),
      },
      new FixedClock(),
    );

    const { portfolios } = await valuation.evaluate([P1, P2]);

    expect(
      [P1, P2].map((id) => [
        portfolios.get(id)?.totals.equity.value,
        portfolios.get(id)?.totals.assetCount,
      ]),
    ).toEqual([
      ['330', 1],
      ['3390', 2],
    ]);
  });
});
