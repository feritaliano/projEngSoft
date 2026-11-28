import { Decimal } from '../../../shared/domain/decimal';
import type { LocalDate } from '../../../shared/domain/local-date';
import type { IndexPoint } from '../../market-data/domain/market-data';
import {
  CompoundedRates,
  CompoundedWindow,
  IndexLevels,
  wholeMonths,
} from './benchmarks';
import { nextMonthStart, plusDays, plusMonths } from './calendar';
import type {
  DerivedValue,
  PortfolioReturns,
  ReturnComparison,
} from './derived-value';
import { derivedValue, marketInput, positionInput } from './market-trace';
import { monthEndDays, PortfolioDay, quotaAt } from './portfolio-history';

const ONE = new Decimal(1);

/**
 * Tolerance, in calendar days, of a series that must reach both ends of a window: without a calendar of holidays, the
 * first value may come a few days after the start (a weekend, a holiday) and the last a few days before the end.
 */
const COVERAGE_DAYS = 7;

/** Index values as published, oldest first: CDI % a day, IPCA % a month on the 1st, Ibovespa points. */
export interface MarketIndexes {
  readonly cdi: readonly IndexPoint[];
  readonly ipca: readonly IndexPoint[];
  readonly ibov: readonly IndexPoint[];
}

/** Cumulative return since the start of the series at a chart point, in % ("9.84" = 9,84%; strings, RN11). */
export interface ReturnPoint {
  readonly date: string;
  readonly value: string;
  readonly cdi: string | null;
  readonly ibov: string | null;
  readonly ipca: string | null;
}

export interface PortfolioPerformance extends PortfolioReturns {
  readonly series: ReturnPoint[];
}

function percentChange(start: Decimal, end: Decimal): Decimal | null {
  return start.isZero() ? null : end.dividedBy(start).minus(ONE).times(100);
}

/**
 * A window [from, to] measured from a start state: the total window starts before the operations of `from` (quota 1,
 * the Ibovespa of the previous trading day), or at the end of `from` when the series starts late (startsAtClose); the
 * 12 months start at the end of `from`, close to close.
 */
interface Window {
  readonly from: string;
  readonly to: string;
  readonly startQuota: Decimal;
  readonly endQuota: Decimal;
  readonly ibovStart: IndexPoint | null;
  /** First day whose IPCA month can count. */
  readonly ipcaFrom: string;
}

class Benchmarks {
  private readonly cdi: CompoundedRates;
  private readonly ipca: CompoundedRates;
  readonly ibov: IndexLevels;

  constructor(
    indexes: MarketIndexes,
    private readonly asOf: LocalDate,
  ) {
    this.cdi = new CompoundedRates(indexes.cdi);
    this.ipca = new CompoundedRates(indexes.ipca);
    this.ibov = new IndexLevels(indexes.ibov);
  }

  /**
   * CDI_RETURN: the daily rates dated in [from, to) (the rate of a day pays the night after it); null unless the series
   * reaches both ends (COVERAGE_DAYS). Inputs dated by the first and the last rate used.
   */
  cdiReturn(from: string, to: string): DerivedValue | null {
    const used = this.cdi.usedIn(from, to);
    if (
      !used ||
      used.first > plusDays(from, COVERAGE_DAYS) ||
      used.last < plusDays(to, -COVERAGE_DAYS)
    ) {
      return null;
    }
    return this.compounded('CDI_RETURN', used);
  }

  /**
   * IBOV_RETURN: points close to close, from `start` to the last point up to `to`; null without a start point (or one
   * older than COVERAGE_DAYS before `startLimit`) or without a point near `to`.
   */
  ibovReturn(
    start: IndexPoint | null,
    startLimit: string,
    to: string,
  ): DerivedValue | null {
    const end = this.ibov.atOrBefore(to);
    if (
      !start ||
      !end ||
      start.date < plusDays(startLimit, -COVERAGE_DAYS) ||
      end.date < plusDays(to, -COVERAGE_DAYS) ||
      end.date === start.date
    ) {
      return null;
    }
    const change = percentChange(
      new Decimal(start.value),
      new Decimal(end.value),
    );
    return (
      change &&
      derivedValue(
        'IBOV_RETURN',
        change,
        [
          marketInput('startValue', start.value, start.date, 'B3_INDEX'),
          marketInput('endValue', end.value, end.date, 'B3_INDEX'),
        ],
        this.asOf,
      )
    );
  }

  /**
   * IPCA_RETURN: the monthly rates of the whole months inside the window, without pro rata, up to the last month
   * published (the current month comes out only in the next one); null unless the series starts by the first month.
   */
  ipcaReturn(from: string, to: string): DerivedValue | null {
    const months = wholeMonths(from, to);
    const published = this.publishedEnd();
    if (!months || !published) {
      return null;
    }
    const endExclusive =
      months.endExclusive < published ? months.endExclusive : published;
    return this.ipcaOver(months.first, endExclusive);
  }

  /** The IPCA of a chart point: null while the month of the point is not published. */
  ipcaPoint(from: string, to: string, toClosesMonth: boolean): string | null {
    const months = wholeMonths(from, to, toClosesMonth);
    const published = this.publishedEnd();
    if (!months || !published || months.endExclusive > published) {
      return null;
    }
    return this.ipcaOver(months.first, months.endExclusive)?.value ?? null;
  }

  private publishedEnd(): string | null {
    const last = this.ipca.lastDate;
    return last === null ? null : nextMonthStart(last);
  }

  private ipcaOver(first: string, endExclusive: string): DerivedValue | null {
    const loadedFrom = this.ipca.firstDate;
    const used = this.ipca.usedIn(first, endExclusive);
    return loadedFrom && loadedFrom <= first && used
      ? this.compounded('IPCA_RETURN', used)
      : null;
  }

  /** Inputs dated by the first and the last rate used. */
  private compounded(
    formulaCode: 'CDI_RETURN' | 'IPCA_RETURN',
    used: CompoundedWindow,
  ): DerivedValue | null {
    const change = percentChange(used.startFactor, used.endFactor);
    return (
      change &&
      derivedValue(
        formulaCode,
        change,
        [
          marketInput('startFactor', used.startFactor, used.first, 'BCB_SGS'),
          marketInput('endFactor', used.endFactor, used.last, 'BCB_SGS'),
        ],
        this.asOf,
      )
    );
  }
}

/** Null when the start quota is zero (a total loss): there is no return to measure from it. */
function comparison(
  window: Window,
  benchmarks: Benchmarks,
  asOf: LocalDate,
): ReturnComparison | null {
  const twr = percentChange(window.startQuota, window.endQuota);
  if (!twr) {
    return null;
  }
  return {
    from: window.from,
    to: window.to,
    value: derivedValue(
      'TWR',
      twr,
      [
        positionInput('startQuota', window.startQuota, window.from),
        positionInput('endQuota', window.endQuota, window.to),
      ],
      asOf,
    ),
    cdi: benchmarks.cdiReturn(window.from, window.to),
    ibov: benchmarks.ibovReturn(window.ibovStart, window.from, window.to),
    ipca: benchmarks.ipcaReturn(window.ipcaFrom, window.to),
  };
}

/**
 * A benchmark value at a chart point; null when its last value is from before the month of `day` (for the CDI, the day
 * before the point: its last rate needed is that of the night before).
 */
function inMonthOf(day: string, value: DerivedValue | null): string | null {
  const last = value?.inputs[1].referenceDate;
  return value && last?.slice(0, 7) === day.slice(0, 7) ? value.value : null;
}

/**
 * B10: TWR of the portfolio over its whole history (from the first operation, or the late start of portfolioDays, to
 * the close date) and the last 12 months, next to CDI, Ibovespa and IPCA over the same windows, and the chart of the
 * total window (the last evaluation day of each month and the close date). Price only: no dividends until S6. `days`
 * come from portfolioDays up to the close date; `firstOperationDate` dates the 12-month availability when every
 * operation is after the close date.
 */
export function portfolioPerformance(
  days: readonly PortfolioDay[],
  indexes: MarketIndexes,
  asOf: LocalDate,
  firstOperationDate: string | null,
): PortfolioPerformance {
  if (days.length === 0) {
    return firstOperationDate === null
      ? { total: null, last12Months: null, series: [] }
      : {
          total: null,
          last12Months: null,
          last12MonthsUnavailableReason: 'SHORT_HISTORY',
          last12MonthsAvailableFrom: plusMonths(firstOperationDate, 12),
          series: [],
        };
  }
  const benchmarks = new Benchmarks(indexes, asOf);
  const [first] = days;
  const from = first.date;
  const last = days[days.length - 1];
  const totalWindow: Window = {
    from,
    to: last.date,
    startQuota: ONE,
    endQuota: last.quota,
    ibovStart: first.startsAtClose
      ? benchmarks.ibov.atOrBefore(from)
      : benchmarks.ibov.before(from),
    ipcaFrom: first.startsAtClose ? plusDays(from, 1) : from,
  };
  const total = comparison(totalWindow, benchmarks, asOf);

  const points = monthEndDays(days);
  const series = points.map((day, index): ReturnPoint => ({
    date: day.date,
    value: day.quota.minus(ONE).times(100).toFixed(),
    cdi: inMonthOf(
      plusDays(day.date, -1),
      benchmarks.cdiReturn(from, day.date),
    ),
    ibov: inMonthOf(
      day.date,
      benchmarks.ibovReturn(totalWindow.ibovStart, from, day.date),
    ),
    ipca: benchmarks.ipcaPoint(
      totalWindow.ipcaFrom,
      day.date,
      index < points.length - 1,
    ),
  }));

  const availableFrom = plusMonths(from, 12);
  if (last.date < availableFrom) {
    return {
      total,
      last12Months: null,
      last12MonthsUnavailableReason: 'SHORT_HISTORY',
      last12MonthsAvailableFrom: availableFrom,
      series,
    };
  }
  const yearAgo = plusMonths(last.date, -12);
  const last12Months = comparison(
    {
      from: yearAgo,
      to: last.date,
      startQuota: quotaAt(days, yearAgo),
      endQuota: last.quota,
      ibovStart: benchmarks.ibov.atOrBefore(yearAgo),
      ipcaFrom: plusDays(yearAgo, 1),
    },
    benchmarks,
    asOf,
  );
  return { total, last12Months, series };
}
