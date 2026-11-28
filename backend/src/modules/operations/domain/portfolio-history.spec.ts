import { buy, sell, split } from '../../../../test/factories/timeline.factory';
import { Decimal } from '../../../shared/domain/decimal';
import type { ClosePoint } from '../../market-data/domain/market-data';
import { calculatePosition } from './position-calculator';
import {
  AssetHistory,
  monthEndDays,
  portfolioDays,
  quotaAt,
} from './portfolio-history';
import type { TimelineItem } from './timeline';

function history(
  items: TimelineItem[],
  closes: [string, string][],
): AssetHistory {
  const calculation = calculatePosition(items);
  if (!calculation.ok) {
    throw calculation.error;
  }
  return {
    steps: calculation.steps,
    closes: closes.map(([date, close]): ClosePoint => ({ date, close })),
  };
}

const round = (value: Decimal, places = 10) => value.toFixed(places);

describe('portfolioDays: daily quotas with the flows on the operation dates (B10, B11)', () => {
  // Calculated by hand (critério do G-S2a): two contributions and one sale in the window.
  //   02/03 buy 10 @ 10, close 10: V = 100, r = (100 − 0 − 100) ÷ (0 + 100) = 0          → quota 1
  //   03/03 close 11:              V = 110, r = (110 − 100) ÷ 100 = 10%                     → quota 1.1
  //   04/03 buy 10 @ 11, close 12: V = 240, r = (240 − 110 − 110) ÷ (110 + 110) = 1/11     → quota 1.2
  //   05/03 sell 5 @ 12, close 12: V = 180, r = (180 − 240 + 60) ÷ 240 = 0                 → quota 1.2
  //   06/03 close 15:              V = 225, r = (225 − 180) ÷ 180 = 25%                     → quota 1.5
  // TWR = 1.5 ÷ 1 − 1 = 50%, while the money-weighted gain (225 + 60 − 210 = 75 over 210 invested) is 35.7%.
  const handCase = history(
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
  );

  it('compounds the daily returns of a hand-calculated case: two buys and a sale give a TWR of 50% (G-S2a)', () => {
    const days = portfolioDays([handCase], '2026-03-06');

    expect(days.map((day) => day.date)).toEqual([
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
      '2026-03-05',
      '2026-03-06',
    ]);
    expect(days.map((day) => round(day.quota, 6))).toEqual([
      '1.000000',
      '1.100000',
      '1.200000',
      '1.200000',
      '1.500000',
    ]);
    expect(days.map((day) => day.equity.toFixed())).toEqual([
      '100',
      '110',
      '240',
      '180',
      '225',
    ]);
    // Cost of the units held: 100, 100, 210, 210 × 15/20 = 157.5 (the PM does not change on a sale, RN06).
    expect(days.map((day) => day.invested.toFixed())).toEqual([
      '100',
      '100',
      '210',
      '157.5',
      '157.5',
    ]);
  });

  it('counts a buy from its executed price: bought at 10 and closed at 12 is +20% on the day (F17)', () => {
    const days = portfolioDays(
      [history([buy('2026-03-02', '1', '10')], [['2026-03-02', '12']])],
      '2026-03-02',
    );

    expect(round(days[0].quota)).toBe('1.2000000000');
  });

  it('takes the fees of a buy as part of the money in, so they cost return on the day', () => {
    const days = portfolioDays(
      [history([buy('2026-03-02', '10', '10', '5')], [['2026-03-02', '10']])],
      '2026-03-02',
    );

    // (100 − 105) ÷ 105
    expect(round(days[0].quota)).toBe('0.9523809524');
  });

  it('values an operation on a day without trading by the previous close, as an evaluation day of its own', () => {
    // Saturday 14/03/2026: PETR4 bought at 36, valued at Friday's close of 40.
    const days = portfolioDays(
      [
        history(
          [buy('2026-03-13', '10', '40'), buy('2026-03-14', '10', '36')],
          [
            ['2026-03-13', '40'],
            ['2026-03-16', '40'],
          ],
        ),
      ],
      '2026-03-16',
    );

    expect(days.map((day) => day.date)).toEqual([
      '2026-03-13',
      '2026-03-14',
      '2026-03-16',
    ]);
    expect(days[1].equity.toFixed()).toBe('800');
    // (800 − 400 − 360) ÷ (400 + 360)
    expect(round(days[1].quota)).toBe(round(new Decimal(800).dividedBy(760)));
  });

  it('values a position without any close at its cost, so it moves the quota only when sold (D55)', () => {
    const bond = history(
      [buy('2026-03-02', '0.5', '2000'), sell('2026-03-04', '0.5', '2100')],
      [],
    );
    const stock = history(
      [buy('2026-03-02', '10', '10')],
      [
        ['2026-03-02', '10'],
        ['2026-03-03', '10'],
        ['2026-03-04', '10'],
      ],
    );

    const days = portfolioDays([bond, stock], '2026-03-04');

    expect(days.map((day) => day.equity.toFixed())).toEqual([
      '1100',
      '1100',
      '100',
    ]);
    // The sale realizes 1050 − 1000 = 50 on 1100.
    expect(round(days[2].quota)).toBe(round(new Decimal(1150).dividedBy(1100)));
  });

  it('keeps the quota while the portfolio is empty and restarts from it on the next buy', () => {
    const days = portfolioDays(
      [
        history(
          [
            buy('2026-03-02', '10', '10'),
            sell('2026-03-03', '10', '12'),
            buy('2026-03-05', '10', '12'),
          ],
          [
            ['2026-03-02', '10'],
            ['2026-03-03', '12'],
            ['2026-03-04', '13'],
            ['2026-03-05', '12'],
            ['2026-03-06', '15'],
          ],
        ),
      ],
      '2026-03-06',
    );

    expect(days.map((day) => round(day.quota, 4))).toEqual([
      '1.0000',
      '1.2000',
      '1.2000',
      '1.2000',
      '1.5000',
    ]);
  });

  it('starts on the first operation, ends on the close date and leaves out operations after it', () => {
    const days = portfolioDays(
      [
        history(
          [buy('2026-03-03', '10', '10'), buy('2026-03-09', '10', '10')],
          [
            ['2026-03-02', '9'],
            ['2026-03-03', '10'],
            ['2026-03-04', '11'],
          ],
        ),
      ],
      '2026-03-05',
    );

    expect(days.map((day) => day.date)).toEqual([
      '2026-03-03',
      '2026-03-04',
      '2026-03-05',
    ]);
    expect(days[2].equity.toFixed()).toBe('110');
  });

  it('has no day without an operation up to the close date', () => {
    expect(
      portfolioDays(
        [history([buy('2026-03-09', '10', '10')], [['2026-03-02', '9']])],
        '2026-03-05',
      ),
    ).toEqual([]);
    expect(portfolioDays([], '2026-03-05')).toEqual([]);
  });

  it('fails loudly on a corporate event, which has no market treatment until S2 (D64b)', () => {
    const calculation = calculatePosition([
      buy('2026-03-02', '10', '10'),
      split('2026-03-03', '1', '2'),
    ]);
    const steps = calculation.ok ? calculation.steps : [];

    expect(() => portfolioDays([{ steps, closes: [] }], '2026-03-04')).toThrow(
      '(S2)',
    );
  });
});

describe('portfolioDays with a quoted asset bought before its first close', () => {
  // The stock was bought on 02/03 but its first close is on 04/03 (history loaded from then): it is never valued at
  // cost. The series starts at the close of 04/03 (quota 1), and the bond, without any close, stays at cost (D55).
  const days = portfolioDays(
    [
      history(
        [buy('2026-03-02', '10', '10')],
        [
          ['2026-03-04', '12'],
          ['2026-03-05', '15'],
        ],
      ),
      history([buy('2026-03-03', '0.5', '2000')], []),
    ],
    '2026-03-05',
  );

  it('starts at the end of the first close of every quoted asset held, quota 1', () => {
    expect(
      days.map((day) => [
        day.date,
        day.equity.toFixed(),
        round(day.quota, 4),
        day.startsAtClose,
      ]),
    ).toEqual([
      ['2026-03-04', '1120', '1.0000', true],
      // (1150 − 1120) ÷ 1120
      ['2026-03-05', '1150', '1.0268', undefined],
    ]);
  });

  it('starts at the latest of those first closes when several assets were bought before theirs', () => {
    const late = portfolioDays(
      [
        history([buy('2026-03-02', '1', '10')], [['2026-03-04', '10']]),
        history([buy('2026-03-02', '1', '10')], [['2026-03-05', '10']]),
      ],
      '2026-03-05',
    );

    expect(late.map((day) => [day.date, day.startsAtClose])).toEqual([
      ['2026-03-05', true],
    ]);
  });

  it('starts normally when the first close is on the day of the buy', () => {
    const normal = portfolioDays(
      [history([buy('2026-03-04', '10', '10')], [['2026-03-04', '12']])],
      '2026-03-04',
    );

    expect(normal[0]).not.toHaveProperty('startsAtClose');
    expect(round(normal[0].quota)).toBe('1.2000000000');
  });
});

describe('quotaAt and monthEndDays', () => {
  const days = portfolioDays(
    [
      history(
        [buy('2026-01-30', '10', '10')],
        [
          ['2026-01-30', '10'],
          ['2026-02-02', '11'],
          ['2026-02-27', '12'],
          ['2026-03-02', '13'],
        ],
      ),
    ],
    '2026-03-02',
  );

  it('reads the quota of the last day up to a date, 1 before the first operation', () => {
    expect(quotaAt(days, '2026-01-29').toFixed()).toBe('1');
    expect(quotaAt(days, '2026-02-01').toFixed()).toBe('1');
    expect(quotaAt(days, '2026-02-28').toFixed()).toBe('1.2');
  });

  it('keeps the last day of each month, the close date included', () => {
    expect(monthEndDays(days).map((day) => day.date)).toEqual([
      '2026-01-30',
      '2026-02-27',
      '2026-03-02',
    ]);
  });
});
