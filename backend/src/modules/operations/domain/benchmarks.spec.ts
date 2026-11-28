import { Decimal } from '../../../shared/domain/decimal';
import { CompoundedRates, IndexLevels, wholeMonths } from './benchmarks';
import {
  isLastDayOfMonth,
  monthStart,
  nextDay,
  nextMonthStart,
  plusMonths,
} from './calendar';

const points = (rows: [string, string][]) =>
  rows.map(([date, value]) => ({ date, value }));

describe('calendar', () => {
  it('adds months keeping the day, or the last day of a shorter month', () => {
    expect(plusMonths('2026-01-05', 12)).toBe('2027-01-05');
    expect(plusMonths('2026-11-12', -12)).toBe('2025-11-12');
    expect(plusMonths('2024-02-29', 12)).toBe('2025-02-28');
    expect(plusMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(plusMonths('2026-12-15', 1)).toBe('2027-01-15');
  });

  it('finds the first day of the month and of the next one', () => {
    expect(monthStart('2026-11-12')).toBe('2026-11-01');
    expect(nextMonthStart('2026-11-12')).toBe('2026-12-01');
    expect(nextMonthStart('2026-12-31')).toBe('2027-01-01');
  });

  it('finds the next day across months and years', () => {
    expect(nextDay('2025-11-12')).toBe('2025-11-13');
    expect(nextDay('2026-02-28')).toBe('2026-03-01');
    expect(nextDay('2025-12-31')).toBe('2026-01-01');
  });

  it('tells the last day of a month', () => {
    expect(isLastDayOfMonth('2026-10-31')).toBe(true);
    expect(isLastDayOfMonth('2026-10-30')).toBe(false);
    expect(isLastDayOfMonth('2028-02-29')).toBe(true);
  });
});

describe('CompoundedRates: CDI in % a day, IPCA in % a month', () => {
  // The BCB publishes CDI on 24/12 and 31/12/2025, days without trading: they compound like any other.
  const cdi = new CompoundedRates(
    points([
      ['2025-12-23', '0.05'],
      ['2025-12-24', '0.05'],
      ['2025-12-26', '0.05'],
      ['2025-12-31', '0.05'],
    ]),
  );

  it('compounds as Π (1 + rate ÷ 100) the rates dated before a date', () => {
    expect(cdi.factorBefore('2025-12-23').toFixed()).toBe('1');
    expect(cdi.factorBefore('2025-12-26').toFixed()).toBe('1.00100025');
    expect(cdi.factorBefore('2026-01-02')).toEqual(
      new Decimal('1.0005').pow(4),
    );
  });

  it('counts the rates in [from, to)', () => {
    expect(cdi.countIn('2025-12-24', '2025-12-31')).toBe(2);
    expect(cdi.countIn('2026-01-01', '2026-01-10')).toBe(0);
  });

  it('knows its last date', () => {
    expect(cdi.lastDate).toBe('2025-12-31');
    expect(new CompoundedRates([]).lastDate).toBeNull();
  });
});

describe('IndexLevels: Ibovespa in points', () => {
  const ibov = new IndexLevels(
    points([
      ['2026-03-12', '100'],
      ['2026-03-13', '110'],
      ['2026-03-16', '120'],
    ]),
  );

  it('reads the last value up to a date, and the last one before it', () => {
    expect(ibov.atOrBefore('2026-03-14')).toEqual({
      date: '2026-03-13',
      value: '110',
    });
    expect(ibov.atOrBefore('2026-03-16')?.value).toBe('120');
    expect(ibov.before('2026-03-16')?.value).toBe('110');
    expect(ibov.before('2026-03-12')).toBeNull();
    expect(ibov.atOrBefore('2026-03-11')).toBeNull();
  });
});

describe('wholeMonths: the IPCA months of a window, without pro rata (D64)', () => {
  it('takes the months entirely inside [from, to]', () => {
    expect(wholeMonths('2025-11-12', '2026-11-12')).toEqual({
      first: '2025-12-01',
      endExclusive: '2026-11-01',
    });
    expect(wholeMonths('2026-02-01', '2026-03-31')).toEqual({
      first: '2026-02-01',
      endExclusive: '2026-04-01',
    });
  });

  it('closes the month of `to` when `to` is the last evaluation day of a past month (chart points)', () => {
    expect(wholeMonths('2026-01-05', '2026-10-30', true)).toEqual({
      first: '2026-02-01',
      endExclusive: '2026-11-01',
    });
  });

  it('is empty when no month fits', () => {
    expect(wholeMonths('2026-01-05', '2026-01-30')).toBeNull();
  });
});
