import { buy, sell } from '../../../../test/factories/timeline.factory';
import { Decimal } from '../../../shared/domain/decimal';
import { LocalDate } from '../../../shared/domain/local-date';
import type { IndexPoint } from '../../market-data/domain/market-data';
import type { DerivedValue } from './derived-value';
import { calculatePosition } from './position-calculator';
import { portfolioDays } from './portfolio-history';
import { MarketIndexes, portfolioPerformance } from './portfolio-returns';
import type { TimelineItem } from './timeline';

const AS_OF = LocalDate.parse('2026-11-28');

function daysOf(
  items: TimelineItem[],
  closes: [string, string][],
  until: string,
) {
  const calculation = calculatePosition(items);
  if (!calculation.ok) throw calculation.error;
  return portfolioDays(
    [
      {
        steps: calculation.steps,
        closes: closes.map(([date, close]) => ({ date, close })),
      },
    ],
    until,
  );
}

const series = (rows: [string, string][]): IndexPoint[] =>
  rows.map(([date, value]) => ({ date, value }));

const round = (value: string | undefined | null, places = 6) =>
  value == null ? value : new Decimal(value).toFixed(places);

const inputsOf = (value: DerivedValue | null) =>
  value?.inputs.map((input) => [input.name, input.value, input.referenceDate]);

const NO_INDEXES: MarketIndexes = { cdi: [], ipca: [], ibov: [] };

describe('portfolioPerformance (B10, D64)', () => {
  // Hand case of portfolio-history.spec.ts: TWR of 50% from 02/03 to 06/03/2026.
  const handDays = daysOf(
    [
      buy('2026-03-02', '10', '10'),
      buy('2026-03-04', '10', '11'),
      sell('2026-03-05', '5', '12'),
    ],
    [
      ['2026-03-02', '10'],
      ['2026-03-03', '11'],
      ['2026-03-04', '12'],
      ['2026-03-05', '12'],
      ['2026-03-06', '15'],
    ],
    '2026-03-06',
  );

  it('gives the total TWR from the first operation to the close date, quotas with base 1 (G-S2a)', () => {
    const { total } = portfolioPerformance(
      handDays,
      NO_INDEXES,
      AS_OF,
      '2026-03-02',
    );

    expect(total).toMatchObject({ from: '2026-03-02', to: '2026-03-06' });
    expect(total?.value.formulaCode).toBe('TWR');
    expect(total?.value.asOf).toBe('2026-11-28');
    expect(round(total?.value.value)).toBe('50.000000');
    expect(total?.value.inputs).toEqual([
      expect.objectContaining({
        name: 'startQuota',
        value: '1',
        source: 'POSITION',
        referenceDate: '2026-03-02',
      }),
      expect.objectContaining({
        name: 'endQuota',
        source: 'POSITION',
        referenceDate: '2026-03-06',
      }),
    ]);
    expect(total).toMatchObject({ cdi: null, ibov: null, ipca: null });
  });

  it('has no 12-month return before 12 months of history, and says from when it will (SHORT_HISTORY)', () => {
    const result = portfolioPerformance(
      handDays,
      NO_INDEXES,
      AS_OF,
      '2026-03-02',
    );

    expect(result.last12Months).toBeNull();
    expect(result.last12MonthsUnavailableReason).toBe('SHORT_HISTORY');
    expect(result.last12MonthsAvailableFrom).toBe('2027-03-02');
  });

  it('has nothing without operations, and only the 12-month date when they all come after the close date', () => {
    expect(portfolioPerformance([], NO_INDEXES, AS_OF, null)).toEqual({
      total: null,
      last12Months: null,
      series: [],
    });
    expect(portfolioPerformance([], NO_INDEXES, AS_OF, '2026-11-20')).toEqual({
      total: null,
      last12Months: null,
      last12MonthsUnavailableReason: 'SHORT_HISTORY',
      last12MonthsAvailableFrom: '2027-11-20',
      series: [],
    });
  });

  describe('a portfolio with more than 12 months', () => {
    // Buy on 15/01/2025 at 10; closes 10 until 12/11/2025 (quota 1), then 11 on 13/11/2025 and 12 on 12/11/2026.
    const days = daysOf(
      [buy('2025-01-15', '10', '10')],
      [
        ['2025-01-15', '10'],
        ['2025-11-12', '10'],
        ['2025-11-13', '11'],
        ['2026-10-30', '11.5'],
        ['2026-11-12', '12'],
      ],
      '2026-11-12',
    );
    const indexes: MarketIndexes = {
      // % a day; the one of the close date is not compounded: it pays the night after it.
      cdi: series([
        ['2025-01-14', '1'],
        ['2025-01-15', '1'],
        ['2025-11-12', '1'],
        ['2025-11-13', '1'],
        ['2026-11-11', '1'],
        ['2026-11-12', '1'],
      ]),
      // % a month on the 1st; 11/2026 not published yet.
      ipca: series([
        ['2025-01-01', '5'],
        ['2025-02-01', '1'],
        ['2025-11-01', '2'],
        ['2025-12-01', '1'],
        ['2026-10-01', '1'],
      ]),
      ibov: series([
        ['2025-01-14', '100'],
        ['2025-01-15', '110'],
        ['2025-11-12', '120'],
        ['2026-11-12', '150'],
      ]),
    };
    const result = portfolioPerformance(days, indexes, AS_OF, '2025-01-15');

    it('takes the 12 months up to the close date, from the quota at the end of the day 12 months before', () => {
      expect(result.last12Months).toMatchObject({
        from: '2025-11-12',
        to: '2026-11-12',
      });
      expect(round(result.last12Months?.value.value)).toBe('20.000000');
      expect(inputsOf(result.last12Months?.value ?? null)?.[0]).toEqual([
        'startQuota',
        '1',
        '2025-11-12',
      ]);
      expect(result.last12MonthsUnavailableReason).toBeUndefined();
    });

    it('compounds the CDI rates dated in [from, close date), with the factors as inputs', () => {
      // total: 15/01/2025, 12/11/2025, 13/11/2025, 11/11/2026 → 1.01⁴; 12 months: the last three → 1.01³.
      expect(round(result.total?.cdi?.value)).toBe(
        new Decimal('1.01').pow(4).minus(1).times(100).toFixed(6),
      );
      expect(round(result.last12Months?.cdi?.value)).toBe('3.030100');
      expect(result.last12Months?.cdi?.formulaCode).toBe('CDI_RETURN');
      expect(inputsOf(result.last12Months?.cdi ?? null)).toEqual([
        ['startFactor', '1.0201', '2025-11-12'],
        ['endFactor', '1.0510100501', '2026-11-11'],
      ]);
      expect(result.last12Months?.cdi?.inputs[0]).toMatchObject({
        source: 'MARKET',
        marketSource: 'BCB_SGS',
      });
    });

    it('reads the Ibovespa close to close: the day before the first operation for the total, the day 12 months before for the 12 months', () => {
      expect(round(result.total?.ibov?.value)).toBe('50.000000');
      expect(inputsOf(result.total?.ibov ?? null)).toEqual([
        ['startValue', '100', '2025-01-14'],
        ['endValue', '150', '2026-11-12'],
      ]);
      expect(round(result.last12Months?.ibov?.value)).toBe('25.000000');
      expect(result.total?.ibov?.inputs[0]).toMatchObject({
        source: 'MARKET',
        marketSource: 'B3_INDEX',
      });
    });

    it('compounds the IPCA of the whole months inside the window up to the last one published, dated by the first and last month', () => {
      // Total: 02/2025 to 10/2026 published: 1.01 × 1.02 × 1.01 × 1.01. 12 months: 12/2025 to 10/2026: 1.01 × 1.01.
      expect(round(result.total?.ipca?.value)).toBe(
        new Decimal('1.01').pow(3).times('1.02').minus(1).times(100).toFixed(6),
      );
      expect(inputsOf(result.last12Months?.ipca ?? null)).toEqual([
        ['startFactor', '1.08171', '2025-12-01'],
        ['endFactor', '1.103452371', '2026-10-01'],
      ]);
      expect(round(result.last12Months?.ipca?.value)).toBe('2.010000');
    });

    it('draws one point per month on its last evaluation day, cumulative since the first operation', () => {
      const points = result.series;
      expect(points.map((point) => point.date)).toEqual([
        '2025-01-15',
        '2025-11-13',
        '2026-10-30',
        '2026-11-12',
      ]);
      expect(points.map((point) => round(point.value, 2))).toEqual([
        '0.00',
        '10.00',
        '15.00',
        '20.00',
      ]);
      // No rate before the first day yet; IPCA of a month counts once its last day is a point.
      expect(points[0]).toMatchObject({ cdi: null, ipca: null });
      expect(round(points[0].ibov, 2)).toBe('10.00');
      expect(round(points[2].ipca, 4)).toBe(
        new Decimal('1.01').pow(3).times('1.02').minus(1).times(100).toFixed(4),
      );
      expect(round(points[3].ipca, 4)).toBe(round(points[2].ipca, 4));
    });
  });

  it('leaves a benchmark null when none of its values falls in the window, and an IPCA point null while its month is not published', () => {
    const days = daysOf(
      [buy('2026-08-14', '1', '10')],
      [
        ['2026-08-14', '10'],
        ['2026-09-30', '10'],
        ['2026-10-30', '11'],
        ['2026-11-12', '11'],
      ],
      '2026-11-12',
    );
    const result = portfolioPerformance(
      days,
      {
        cdi: series([['2026-01-02', '1']]),
        ipca: series([['2026-09-01', '1']]),
        ibov: series([['2026-01-02', '100']]),
      },
      AS_OF,
      '2026-08-14',
    );

    expect(result.total).toMatchObject({ cdi: null, ibov: null });
    // 09/2026 is the last month published: the window stops there.
    expect(round(result.total?.ipca?.value, 2)).toBe('1.00');
    expect(result.series.map((point) => round(point.ipca, 2))).toEqual([
      null,
      '1.00',
      null,
      null,
    ]);
    expect(result.series.map((point) => point.ibov)).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it('leaves the IPCA null when no month of the window was loaded, even with later months published', () => {
    const days = daysOf(
      [buy('2026-01-05', '1', '10')],
      [
        ['2026-01-05', '10'],
        ['2026-02-27', '10'],
        ['2026-03-31', '10'],
      ],
      '2026-03-31',
    );
    const result = portfolioPerformance(
      days,
      { ...NO_INDEXES, ipca: series([['2026-10-01', '1']]) },
      AS_OF,
      '2026-01-05',
    );

    expect(result.total?.ipca).toBeNull();
    expect(result.series.map((point) => point.ipca)).toEqual([
      null,
      null,
      null,
    ]);
  });
});

describe('portfolioPerformance windows and coverage (D64)', () => {
  const steady = (from: string, to: string, closes: [string, string][]) =>
    daysOf([buy(from, '10', '10')], closes, to);

  it('gives the 12 months exactly 12 months after the first operation', () => {
    const days = steady('2025-11-12', '2026-11-12', [
      ['2025-11-12', '10'],
      ['2026-11-12', '12'],
    ]);

    const result = portfolioPerformance(days, NO_INDEXES, AS_OF, '2025-11-12');

    expect(result.last12Months).toMatchObject({
      from: '2025-11-12',
      to: '2026-11-12',
    });
    expect(round(result.last12Months?.value.value, 2)).toBe('20.00');
    expect(result).not.toHaveProperty('last12MonthsUnavailableReason');
  });

  it('counts the IPCA from the next month when the 12 months start on the last day of a month', () => {
    const days = steady('2025-09-01', '2026-09-30', [
      ['2025-09-01', '10'],
      ['2026-09-30', '10'],
    ]);
    const ipca = series(
      ['2025-09-01', '2025-10-01', '2026-09-01'].map((date) => [date, '1']),
    );

    const result = portfolioPerformance(
      days,
      { ...NO_INDEXES, ipca },
      AS_OF,
      '2025-09-01',
    );

    // From 30/09/2025 (end of day) to 30/09/2026: 10/2025 to 09/2026; 09/2025 stays out.
    expect(inputsOf(result.last12Months?.ipca ?? null)).toEqual([
      ['startFactor', '1.01', '2025-10-01'],
      ['endFactor', '1.030301', '2026-09-01'],
    ]);
  });

  it('measures a late start from the close of its first day: Ibovespa of that day, IPCA from the next', () => {
    // Bought on 30/01 before the first close loaded, on 02/02.
    const days = daysOf(
      [buy('2026-01-30', '10', '10')],
      [
        ['2026-02-02', '10'],
        ['2026-03-31', '11'],
      ],
      '2026-03-31',
    );
    const result = portfolioPerformance(
      days,
      {
        cdi: [],
        ipca: series([
          ['2026-02-01', '5'],
          ['2026-03-01', '1'],
        ]),
        ibov: series([
          ['2026-01-30', '90'],
          ['2026-02-02', '100'],
          ['2026-03-31', '110'],
        ]),
      },
      AS_OF,
      '2026-01-30',
    );

    expect(result.total).toMatchObject({
      from: '2026-02-02',
      to: '2026-03-31',
    });
    expect(round(result.total?.value.value, 2)).toBe('10.00');
    expect(inputsOf(result.total?.ibov ?? null)?.[0]).toEqual([
      'startValue',
      '100',
      '2026-02-02',
    ]);
    // 02/2026 does not count whole: the window starts at the end of 02/02.
    expect(round(result.total?.ipca?.value, 2)).toBe('1.00');
    expect(result.last12MonthsAvailableFrom).toBe('2027-02-02');
  });

  describe('benchmarks need both ends of the window (null otherwise)', () => {
    const days = steady('2026-03-02', '2026-04-30', [
      ['2026-03-02', '10'],
      ['2026-03-31', '10'],
      ['2026-04-30', '11'],
    ]);
    const run = (indexes: Partial<MarketIndexes>) =>
      portfolioPerformance(
        days,
        { ...NO_INDEXES, ...indexes },
        AS_OF,
        '2026-03-02',
      );

    it('takes a CDI that starts a few days after the start and ends a few days before the end, dated by the rates used', () => {
      const result = run({
        cdi: series([
          ['2026-03-04', '1'],
          ['2026-04-24', '1'],
        ]),
      });

      expect(inputsOf(result.total?.cdi ?? null)).toEqual([
        ['startFactor', '1', '2026-03-04'],
        ['endFactor', '1.0201', '2026-04-24'],
      ]);
    });

    it.each([
      [
        'starts too late',
        [
          ['2026-03-20', '1'],
          ['2026-04-29', '1'],
        ],
      ],
      [
        'ends too early',
        [
          ['2026-03-02', '1'],
          ['2026-04-10', '1'],
        ],
      ],
    ] as [string, [string, string][]][])(
      'leaves the CDI null when the series %s',
      (_case, rows) => {
        expect(run({ cdi: series(rows) }).total?.cdi).toBeNull();
      },
    );

    it.each([
      [
        'has no point near the start',
        [
          ['2026-01-02', '90'],
          ['2026-04-30', '100'],
        ],
      ],
      [
        'has no point near the end',
        [
          ['2026-02-27', '90'],
          ['2026-04-10', '100'],
        ],
      ],
      [
        'has no point before the start',
        [
          ['2026-03-02', '90'],
          ['2026-04-30', '100'],
        ],
      ],
    ] as [string, [string, string][]][])(
      'leaves the Ibovespa null when the series %s',
      (_case, rows) => {
        expect(run({ ibov: series(rows) }).total?.ibov).toBeNull();
      },
    );

    it('leaves a chart point null when the last value of a benchmark is from before its month', () => {
      const result = run({
        cdi: series([
          ['2026-03-02', '1'],
          ['2026-03-30', '1'],
          ['2026-04-01', '1'],
        ]),
        ibov: series([
          ['2026-02-27', '90'],
          ['2026-03-31', '100'],
          ['2026-04-01', '100'],
        ]),
      });

      // 31/03: values of March. 30/04: the last ones are of 01/04, more than 7 days before.
      expect(
        result.series.map((point) => [
          point.date,
          point.cdi !== null,
          point.ibov !== null,
        ]),
      ).toEqual([
        ['2026-03-31', true, true],
        ['2026-04-30', false, false],
      ]);
    });

    it('keeps the CDI of a point on the 1st, whose last rate needed is of the day before', () => {
      const days = steady('2026-08-03', '2026-09-01', [
        ['2026-08-03', '10'],
        ['2026-09-01', '10'],
      ]);
      const result = portfolioPerformance(
        days,
        {
          ...NO_INDEXES,
          cdi: series([
            ['2026-08-03', '1'],
            ['2026-08-31', '1'],
          ]),
        },
        AS_OF,
        '2026-08-03',
      );

      expect(round(result.series[1].cdi, 4)).toBe('2.0100');
    });

    it('leaves a chart point null when the last value is from the month before, even within the tolerance', () => {
      const early = steady('2026-03-02', '2026-04-02', [
        ['2026-03-02', '10'],
        ['2026-03-31', '10'],
        ['2026-04-02', '11'],
      ]);
      const result = portfolioPerformance(
        early,
        {
          ...NO_INDEXES,
          cdi: series([
            ['2026-03-02', '1'],
            ['2026-03-31', '1'],
          ]),
          ibov: series([
            ['2026-02-27', '90'],
            ['2026-03-31', '100'],
          ]),
        },
        AS_OF,
        '2026-03-02',
      );

      expect(result.total?.cdi).not.toBeNull();
      expect(result.total?.ibov).not.toBeNull();
      expect(result.series[1]).toMatchObject({
        date: '2026-04-02',
        cdi: null,
        ibov: null,
      });
    });
  });

  it('has no 12-month return from a zero quota (total loss), instead of dividing by zero', () => {
    const zero = new Decimal(0);
    const days = [
      { date: '2025-01-02', equity: zero, invested: zero, quota: zero },
      { date: '2026-01-05', equity: zero, invested: zero, quota: zero },
    ];

    const result = portfolioPerformance(days, NO_INDEXES, AS_OF, '2025-01-02');

    expect(round(result.total?.value.value, 2)).toBe('-100.00');
    expect(result.last12Months).toBeNull();
  });
});
