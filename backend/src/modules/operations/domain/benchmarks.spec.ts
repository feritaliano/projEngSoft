import { Decimal } from '../../../shared/domain/decimal';
import { CompoundedRates, IndexLevels, wholeMonths } from './benchmarks';
import {
  isLastDayOfMonth,
  monthStart,
  nextMonthStart,
  plusDays,
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

  it('adds calendar days across months and years', () => {
    expect(plusDays('2025-11-12', 1)).toBe('2025-11-13');
    expect(plusDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(plusDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(plusDays('2026-03-02', -7)).toBe('2026-02-23');
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

  it('compounds as Π (1 + rate ÷ 100) the rates dated in [from, to), with the first and last used', () => {
    expect(cdi.usedIn('2025-12-24', '2025-12-31')).toEqual({
      first: '2025-12-24',
      last: '2025-12-26',
      startFactor: new Decimal('1.0005'),
      endFactor: new Decimal('1.0005').pow(3),
    });
    expect(cdi.usedIn('2025-12-01', '2026-01-02')?.endFactor).toEqual(
      new Decimal('1.0005').pow(4),
    );
    expect(cdi.usedIn('2026-01-01', '2026-01-10')).toBeNull();
  });

  it('knows its first and last date', () => {
    expect([cdi.firstDate, cdi.lastDate]).toEqual(['2025-12-23', '2025-12-31']);
    const empty = new CompoundedRates([]);
    expect([empty.firstDate, empty.lastDate]).toEqual([null, null]);
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
