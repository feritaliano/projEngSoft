import { buy, sell } from '../../../../test/factories/timeline.factory';
import { Decimal } from '../../../shared/domain/decimal';
import { LocalDate } from '../../../shared/domain/local-date';
import type { AssetType } from './asset-type';
import type { AssetRef } from './catalog-refs';
import type { DerivedValue } from './derived-value';
import {
  MarketPositionLine,
  marketAllocation,
  marketPositions,
  MarketClosing,
  marketTotals,
  userEquity,
} from './market-position';
import type { AssetHistory } from './portfolio-history';
import { calculatePosition } from './position-calculator';
import { PositionLine, positionLine, portfolioTotals } from './position-trace';
import type { TimelineItem } from './timeline';

const AS_OF = LocalDate.parse('2026-11-28');
const CLOSE_DATE = '2026-11-12';

interface Holding {
  asset: AssetRef;
  items: TimelineItem[];
  closes: [string, string][];
}

function asset(name: string, assetType: AssetType = 'STOCK'): AssetRef {
  return {
    id: `asset-${name}`,
    ticker: assetType === 'FIXED_INCOME' ? null : name,
    displayName: name,
    assetType,
  };
}

const CLOSING: MarketClosing = {
  closeDate: CLOSE_DATE,
  previousCloseDate: '2026-11-11',
};

function valued(holdings: Holding[], closing: MarketClosing | null = CLOSING) {
  const lines: PositionLine[] = [];
  const market = new Map<string, AssetHistory>();
  for (const holding of holdings) {
    const calculation = calculatePosition(holding.items);
    if (!calculation.ok) throw calculation.error;
    const line = positionLine(
      holding.asset,
      calculation.position,
      calculation.steps,
      { asOf: AS_OF, brokerOf: (id) => ({ id, name: id }) },
    );
    if (line) lines.push(line);
    market.set(holding.asset.id, {
      steps: calculation.steps,
      closes: holding.closes.map(([date, close]) => ({ date, close })),
    });
  }
  return marketPositions(lines, (id) => market.get(id)!, closing, AS_OF);
}

const byName = (lines: readonly MarketPositionLine[], name: string) =>
  lines.find((line) => line.asset.displayName === name)!;

const value = (derived: DerivedValue | null | undefined, places = 2) =>
  derived ? new Decimal(derived.value).toFixed(places) : derived;

const PETR4 = asset('PETR4');

/** The links an input may carry, whatever its source. */
const linked = (input: unknown) =>
  input as { derived?: DerivedValue; asset?: { ticker: string | null } };

describe('marketPositions (B8, D64)', () => {
  it('values an open position at quantity × the last close and traces it (MARKET_VALUE, D27)', () => {
    const { lines } = valued([
      {
        asset: PETR4,
        items: [buy('2026-01-05', '100', '30', '0')],
        closes: [
          ['2026-11-11', '31'],
          ['2026-11-12', '32.18'],
        ],
      },
    ]);
    const line = lines[0];

    expect(line.lastClose).toEqual({
      value: '32.18',
      date: '2026-11-12',
      source: 'B3_COTAHIST',
    });
    expect(line).not.toHaveProperty('unavailableReason');
    expect(line.marketValue).toEqual({
      value: '3218',
      formulaCode: 'MARKET_VALUE',
      asOf: '2026-11-28',
      inputs: [
        {
          name: 'quantity',
          value: '100',
          source: 'POSITION',
          referenceDate: '2026-11-28',
        },
        {
          name: 'lastClose',
          value: '32.18',
          source: 'MARKET',
          marketSource: 'B3_COTAHIST',
          referenceDate: '2026-11-12',
        },
      ],
    });
  });

  it('gives the gain over the total cost in R$ and %, the % equal to the change over the PM', () => {
    const { lines } = valued([
      {
        asset: PETR4,
        items: [buy('2026-01-05', '100', '29.95', '5')],
        closes: [['2026-11-12', '36']],
      },
    ]);
    const line = lines[0];

    // Cost 3000 (PM 30): market value 3600, gain 600 = 20% = (36 − 30) ÷ 30.
    expect(value(line.unrealizedProfit)).toBe('600.00');
    expect(line.unrealizedProfit?.formulaCode).toBe('UNREALIZED_PROFIT');
    expect(line.unrealizedProfit?.inputs.map((input) => input.name)).toEqual([
      'marketValue',
      'totalCost',
    ]);
    expect(value(line.unrealizedProfitPercent)).toBe('20.00');
    expect(
      line.unrealizedProfitPercent?.inputs.map((input) => input.name),
    ).toEqual(['unrealizedProfit', 'totalCost']);
  });

  it('keeps fixed income and crypto at their cost, with the reason and no gain (D55, NO_QUOTE)', () => {
    const { lines } = valued([
      {
        asset: asset('Tesouro IPCA+ 2035', 'FIXED_INCOME'),
        items: [buy('2026-03-02', '0.52', '3846.15384615', '0')],
        closes: [],
      },
    ]);
    const line = lines[0];

    expect(line).toMatchObject({
      lastClose: null,
      unavailableReason: 'NO_QUOTE',
      unrealizedProfit: null,
      unrealizedProfitPercent: null,
      dayChange: null,
      dayChangePercent: null,
    });
    expect(line.marketValue?.formulaCode).toBe('MARKET_VALUE_AT_COST');
    expect(line.marketValue?.inputs).toEqual([
      expect.objectContaining({
        name: 'totalCost',
        source: 'DERIVED',
        derived: line.totalCost,
      }),
    ]);
    expect(line.marketValue?.value).toBe(line.totalCost?.value);
    expect(value(line.portfolioWeight)).toBe('100.00');
  });

  it('leaves every market number null on a closed position, without a reason (D41)', () => {
    const { lines } = valued([
      {
        asset: PETR4,
        items: [buy('2026-01-05', '10', '30'), sell('2026-02-05', '10', '35')],
        closes: [['2026-11-12', '36']],
      },
    ]);

    expect(lines[0]).toMatchObject({
      status: 'CLOSED',
      lastClose: null,
      marketValue: null,
      unrealizedProfit: null,
      unrealizedProfitPercent: null,
      dayChange: null,
      dayChangePercent: null,
      portfolioWeight: null,
    });
    expect(lines[0]).not.toHaveProperty('unavailableReason');
  });

  describe('day change over the close date (POSITION_DAY_CHANGE)', () => {
    it('is the move from the previous close with the quantities of each day', () => {
      const { lines } = valued([
        {
          asset: PETR4,
          items: [buy('2026-01-05', '100', '30')],
          closes: [
            ['2026-11-11', '31'],
            ['2026-11-12', '32'],
          ],
        },
      ]);
      const { dayChange, dayChangePercent } = lines[0];

      expect(value(dayChange)).toBe('100.00');
      expect(
        dayChange?.inputs.map((input) => [input.name, input.value]),
      ).toEqual([
        ['marketValue', '3200'],
        ['previousMarketValue', '3100'],
        ['dayBuys', '0'],
        ['daySales', '0'],
      ]);
      expect(linked(dayChange?.inputs[1]).derived?.inputs[1]).toMatchObject({
        name: 'lastClose',
        value: '31',
        referenceDate: '2026-11-11',
      });
      expect(value(dayChangePercent, 6)).toBe(
        new Decimal(100).dividedBy(3100).times(100).toFixed(6),
      );
      expect(dayChangePercent?.inputs.map((input) => input.name)).toEqual([
        'dayChange',
        'previousMarketValue',
        'dayBuys',
      ]);
    });

    it('counts a buy of the day from its executed price: bought at 10, closed at 12 is +20% (F17)', () => {
      const { lines } = valued([
        {
          asset: PETR4,
          items: [buy('2026-11-12', '10', '10', '0')],
          closes: [
            ['2026-11-11', '11'],
            ['2026-11-12', '12'],
          ],
        },
      ]);

      expect(value(lines[0].dayChange)).toBe('20.00');
      expect(value(lines[0].dayChangePercent)).toBe('20.00');
    });

    it('counts a sale of the day at its net price and leaves out operations after the close date', () => {
      const { lines } = valued([
        {
          asset: PETR4,
          items: [
            buy('2026-01-05', '100', '30'),
            sell('2026-11-12', '50', '33', '1'),
            buy('2026-11-20', '100', '40'),
          ],
          closes: [
            ['2026-11-11', '31'],
            ['2026-11-12', '32'],
          ],
        },
      ]);
      const line = lines[0];

      // 50 × 32 − 100 × 31 + (50 × 33 − 1) = 149, on 3100.
      expect(value(line.dayChange)).toBe('149.00');
      expect(line.dayChange?.inputs[3].value).toBe('1649');
      // Market value with the quantity of today: 150 units.
      expect(value(line.marketValue)).toBe('4800.00');
    });

    it('takes operations on a day without trading before the close date into the day (14/03/2026 is a Saturday)', () => {
      const { lines } = valued(
        [
          {
            asset: PETR4,
            items: [
              buy('2026-03-12', '10', '40'),
              buy('2026-03-14', '10', '36'),
            ],
            closes: [
              ['2026-03-13', '40'],
              ['2026-03-16', '41'],
            ],
          },
        ],
        { closeDate: '2026-03-16', previousCloseDate: '2026-03-13' },
      );

      // 20 × 41 − 10 × 40 − 360
      expect(value(lines[0].dayChange)).toBe('60.00');
      expect(lines[0].dayChange?.inputs[2]).toMatchObject({
        name: 'dayBuys',
        value: '360',
        referenceDate: '2026-03-16',
      });
    });

    it('changes 0 for an asset that did not trade between the previous trading day and the close date', () => {
      const { lines } = valued([
        {
          asset: PETR4,
          items: [buy('2026-01-05', '10', '30')],
          closes: [
            ['2026-11-09', '30'],
            ['2026-11-10', '33'],
          ],
        },
      ]);

      expect(lines[0].lastClose?.date).toBe('2026-11-10');
      expect(value(lines[0].dayChange)).toBe('0.00');
      expect(
        linked(lines[0].dayChange?.inputs[1]).derived?.inputs[1],
      ).toMatchObject({
        name: 'lastClose',
        value: '33',
        referenceDate: '2026-11-10',
      });
    });

    it('starts from zero on the first trading day of an asset bought on it, and is null when held before it', () => {
      const listedToday = valued([
        {
          asset: PETR4,
          items: [buy('2026-11-12', '10', '10')],
          closes: [['2026-11-12', '11']],
        },
      ]).lines[0];
      expect(value(listedToday.dayChange)).toBe('10.00');
      expect(listedToday.dayChange?.inputs[1]).toMatchObject({
        name: 'previousMarketValue',
        value: '0',
        source: 'POSITION',
      });

      const heldBefore = valued([
        {
          asset: PETR4,
          items: [buy('2026-11-05', '10', '10')],
          closes: [['2026-11-12', '11']],
        },
      ]).lines[0];
      expect(heldBefore).toMatchObject({
        dayChange: null,
        dayChangePercent: null,
      });
    });

    it('starts from zero on the first trading day of the market', () => {
      const [line] = valued(
        [
          {
            asset: PETR4,
            items: [buy('2026-11-12', '10', '10')],
            closes: [['2026-11-12', '11']],
          },
        ],
        { closeDate: CLOSE_DATE, previousCloseDate: null },
      ).lines;

      expect(value(line.dayChange)).toBe('10.00');
      expect(line.dayChange?.inputs[1]).toMatchObject({
        name: 'previousMarketValue',
        value: '0',
        referenceDate: CLOSE_DATE,
      });
    });

    it('has no percentage when nothing was held nor bought in the window', () => {
      const { lines } = valued([
        {
          asset: PETR4,
          items: [buy('2026-11-20', '10', '10')],
          closes: [
            ['2026-11-11', '11'],
            ['2026-11-12', '12'],
          ],
        },
      ]);

      expect(value(lines[0].dayChange)).toBe('0.00');
      expect(lines[0].dayChangePercent).toBeNull();
    });
  });

  it('weighs each open position over the equity and orders the classes by market value (D63)', () => {
    const { lines, equity } = valued([
      {
        asset: PETR4,
        items: [buy('2026-01-05', '100', '30')],
        closes: [['2026-11-12', '10']],
      },
      {
        asset: asset('MXRF11', 'FII'),
        items: [buy('2026-01-05', '100', '10')],
        closes: [['2026-11-12', '15']],
      },
    ]);

    // By cost the stocks (3000) come first; by market value the FII (1500 > 1000).
    expect(lines.map((line) => line.asset.displayName)).toEqual([
      'MXRF11',
      'PETR4',
    ]);
    expect(value(equity)).toBe('2500.00');
    expect(value(byName(lines, 'MXRF11').portfolioWeight)).toBe('60.00');
    expect(
      byName(lines, 'PETR4').portfolioWeight?.inputs.map((input) => [
        input.name,
        input.value,
      ]),
    ).toEqual([
      ['marketValue', '1000'],
      ['equity', '2500'],
    ]);
  });

  it('breaks a tie of the class values by the fixed order of the classes (D63)', () => {
    const { lines } = valued([
      {
        asset: asset('MXRF11', 'FII'),
        items: [buy('2026-01-05', '10', '10')],
        closes: [['2026-11-12', '10']],
      },
      {
        asset: PETR4,
        items: [buy('2026-01-05', '1', '50')],
        closes: [['2026-11-12', '100']],
      },
    ]);

    expect(lines.map((line) => line.asset.displayName)).toEqual([
      'PETR4',
      'MXRF11',
    ]);
  });

  it('lists the closed positions after the open ones, by the fixed order of the classes, then by name', () => {
    const closed = (name: string, type: AssetType = 'STOCK'): Holding => ({
      asset: asset(name, type),
      items: [buy('2026-01-05', '10', '10'), sell('2026-02-05', '10', '12')],
      closes: [['2026-11-12', '12']],
    });
    const { lines } = valued([
      closed('MXRF11', 'FII'),
      closed('WEGE3'),
      {
        asset: asset('BTC', 'CRYPTO'),
        items: [buy('2026-01-05', '0.01', '100')],
        closes: [],
      },
      closed('ITSA4'),
    ]);

    expect(lines.map((line) => line.asset.displayName)).toEqual([
      'BTC',
      'ITSA4',
      'WEGE3',
      'MXRF11',
    ]);
  });

  it('has no close date and every position at cost before any quote is loaded', () => {
    const { lines } = valued(
      [
        {
          asset: PETR4,
          items: [buy('2026-01-05', '100', '30')],
          closes: [],
        },
      ],
      null,
    );

    expect(lines[0]).toMatchObject({
      lastClose: null,
      unavailableReason: 'NO_QUOTE',
    });
  });
});

describe('marketTotals (B8)', () => {
  it('gives the equity and the gain over the total cost of the open positions', () => {
    const { lines, equity } = valued([
      {
        asset: PETR4,
        items: [buy('2026-01-05', '100', '30')],
        closes: [['2026-11-12', '33']],
      },
      {
        asset: asset('BTC', 'CRYPTO'),
        items: [buy('2026-07-29', '0.0125', '328000')],
        closes: [],
      },
    ]);
    const totals = marketTotals(portfolioTotals(lines, AS_OF), equity, AS_OF);

    expect(value(totals.equity)).toBe('7400.00');
    expect(totals.equity.formulaCode).toBe('PORTFOLIO_EQUITY');
    expect(totals.equity.inputs.map((input) => input.name)).toEqual([
      'positions',
      'positions',
    ]);
    expect(value(totals.unrealizedProfit)).toBe('300.00');
    expect(
      totals.unrealizedProfit.inputs.map(
        (input) => linked(input).derived?.formulaCode,
      ),
    ).toEqual(['PORTFOLIO_EQUITY', 'PORTFOLIO_TOTAL_COST']);
    expect(value(totals.unrealizedProfitPercent, 6)).toBe(
      new Decimal(300).dividedBy(7100).times(100).toFixed(6),
    );
  });

  it('has a zero equity and no percentage without open positions', () => {
    const { lines, equity } = valued([]);
    const totals = marketTotals(portfolioTotals(lines, AS_OF), equity, AS_OF);

    expect(totals.equity).toMatchObject({ value: '0', inputs: [] });
    expect(totals.unrealizedProfit.value).toBe('0');
    expect(totals.unrealizedProfitPercent).toBeNull();
  });
});

describe('marketAllocation (B9)', () => {
  const { lines, equity } = valued([
    {
      asset: PETR4,
      items: [buy('2026-01-05', '100', '30')],
      closes: [['2026-11-12', '30']],
    },
    {
      asset: asset('VALE3'),
      items: [buy('2026-01-05', '5', '50')],
      closes: [['2026-11-12', '50']],
    },
    {
      asset: asset('ABEV3'),
      items: [buy('2026-01-05', '25', '10')],
      closes: [['2026-11-12', '10']],
    },
    {
      asset: asset('MXRF11', 'FII'),
      items: [buy('2026-01-05', '100', '10')],
      closes: [['2026-11-12', '10']],
    },
    {
      asset: asset('BTC', 'CRYPTO'),
      items: [buy('2026-01-05', '0.01', '50000')],
      closes: [],
    },
    {
      asset: asset('WEGE3'),
      items: [buy('2026-01-05', '10', '30'), sell('2026-02-05', '10', '40')],
      closes: [['2026-11-12', '45']],
    },
  ]);
  const sectors: Record<string, string | null> = {
    'asset-PETR4': 'Petróleo',
    'asset-VALE3': 'Mineração',
    'asset-ABEV3': 'Bebidas',
    'asset-MXRF11': null,
    'asset-BTC': null,
    'asset-WEGE3': 'Bens de capital',
  };
  const allocation = marketAllocation(
    lines,
    equity,
    (id) => sectors[id],
    AS_OF,
  );

  it('groups the open positions by class in the order of the positions, over the equity', () => {
    expect(
      allocation.byClass.map((group) => [
        group.assetType,
        value(group.value),
        value(group.percent),
      ]),
    ).toEqual([
      ['STOCK', '3500.00', '70.00'],
      ['FII', '1000.00', '20.00'],
      ['CRYPTO', '500.00', '10.00'],
    ]);
    expect(allocation.byClass[0].value.formulaCode).toBe('ALLOCATION_VALUE');
    expect(
      allocation.byClass[0].value.inputs.map(
        (input) => linked(input).asset?.ticker,
      ),
    ).toEqual(['ABEV3', 'PETR4', 'VALE3']);
    expect(
      allocation.byClass[0].percent.inputs.map((input) => input.name),
    ).toEqual(['groupValue', 'equity']);
  });

  it('groups by sector by value, a tie by name, the assets without sector last', () => {
    expect(
      allocation.bySector.map((group) => [group.sector, value(group.value)]),
    ).toEqual([
      ['Petróleo', '3000.00'],
      ['Bebidas', '250.00'],
      ['Mineração', '250.00'],
      [null, '1500.00'],
    ]);
    expect(allocation.bySector[3].percent.formulaCode).toBe(
      'ALLOCATION_PERCENT',
    );
  });
});

describe('userEquity (B8)', () => {
  it('sums the equity of every portfolio, one input per portfolio linked to its own trace', () => {
    const { equity } = valued([
      {
        asset: PETR4,
        items: [buy('2026-01-05', '10', '30')],
        closes: [['2026-11-12', '33']],
      },
    ]);
    const total = userEquity(
      [
        { id: 'p1', name: 'Longo prazo', equity },
        { id: 'p2', name: 'Vazia', equity: valued([]).equity },
      ],
      AS_OF,
    );

    expect(total.formulaCode).toBe('USER_EQUITY');
    expect(total.value).toBe('330');
    expect(total.inputs[0]).toEqual({
      name: 'portfolios',
      value: '330',
      source: 'PORTFOLIO',
      referenceDate: '2026-11-28',
      portfolio: { id: 'p1', name: 'Longo prazo' },
      derived: equity,
    });
    expect(userEquity([], AS_OF)).toMatchObject({ value: '0', inputs: [] });
  });
});
