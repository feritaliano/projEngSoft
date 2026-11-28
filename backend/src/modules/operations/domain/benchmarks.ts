import { Decimal, toDecimal } from '../../../shared/domain/decimal';
import type { IndexPoint } from '../../market-data/domain/market-data';
import { isLastDayOfMonth, monthStart, nextMonthStart } from './calendar';

const ONE = new Decimal(1);

/** First index dated on or after `date`, or strictly after it when `includeDate` is false (points oldest first). */
function lowerBound(
  points: readonly { date: string }[],
  date: string,
  includeDate = true,
): number {
  let low = 0;
  let high = points.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    const point = points[middle].date;
    if (point < date || (!includeDate && point === date)) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

/**
 * A rate series in % per period as the BCB publishes it (SGS): CDI (12) in % a day on every banking day, trading or
 * not (24/12 and 31/12/2025 too); IPCA (433) in % a month on the 1st of the month. Compounded as Π (1 + rate ÷ 100).
 */
export class CompoundedRates {
  private readonly points: readonly IndexPoint[];
  /** factors[i] = Π (1 + rate ÷ 100) of points[0..i). */
  private readonly factors: readonly Decimal[];

  constructor(points: readonly IndexPoint[]) {
    this.points = points;
    const factors = [ONE];
    for (const point of points) {
      const rate = toDecimal(point.value, 'value').dividedBy(100);
      factors.push(factors[factors.length - 1].times(ONE.plus(rate)));
    }
    this.factors = factors;
  }

  /** Factor of the rates dated before `date`: what 1 at the start of the series is worth at the start of `date`. */
  factorBefore(date: string): Decimal {
    return this.factors[lowerBound(this.points, date)];
  }

  /** Rates dated in [from, toExclusive). */
  countIn(from: string, toExclusive: string): number {
    return lowerBound(this.points, toExclusive) - lowerBound(this.points, from);
  }

  get lastDate(): string | null {
    return this.points.length > 0
      ? this.points[this.points.length - 1].date
      : null;
  }
}

/** A series of levels (Ibovespa points), read close to close. */
export class IndexLevels {
  constructor(private readonly points: readonly IndexPoint[]) {}

  atOrBefore(date: string): IndexPoint | null {
    return this.points[lowerBound(this.points, date, false) - 1] ?? null;
  }

  before(date: string): IndexPoint | null {
    return this.points[lowerBound(this.points, date) - 1] ?? null;
  }
}

/**
 * IPCA months entirely inside [from, to], without pro rata (D64): from the month that starts on or after `from` to
 * the month that ends on or before `to`, as [first, endExclusive). `toClosesMonth`: `to` is the last evaluation day
 * of a month already over (a chart point), so its month counts. Null when no month fits.
 */
export function wholeMonths(
  from: string,
  to: string,
  toClosesMonth = false,
): { first: string; endExclusive: string } | null {
  const first = from.endsWith('-01') ? from : nextMonthStart(from);
  const endExclusive =
    toClosesMonth || isLastDayOfMonth(to) ? nextMonthStart(to) : monthStart(to);
  return first < endExclusive ? { first, endExclusive } : null;
}
