import { Decimal } from '../../../shared/domain/decimal';
import type { LocalDate } from '../../../shared/domain/local-date';
import type { IndexPoint } from '../../market-data/domain/market-data';
import { CompoundedRates, IndexLevels, wholeMonths } from './benchmarks';
import { nextDay, nextMonthStart, plusMonths } from './calendar';
import type {
  DerivedValue,
  PortfolioReturns,
  ReturnComparison,
} from './derived-value';
import { derivedValue, marketInput, positionInput } from './market-trace';
import { monthEndDays, PortfolioDay, quotaAt } from './portfolio-history';

const ONE = new Decimal(1);

/** Index values as published, oldest first: CDI % a day, IPCA % a month on the 1st, Ibovespa points. */
export interface MarketIndexes {
  readonly cdi: readonly IndexPoint[];
  readonly ipca: readonly IndexPoint[];
  readonly ibov: readonly IndexPoint[];
}

/** Cumulative return since the first operation at a chart point, in percentage points (strings, RN11). */
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

/** (end ÷ start − 1) × 100. */
const percentChange = (start: Decimal, end: Decimal) =>
  end.dividedBy(start).minus(ONE).times(100);

/**
 * A window [from, to] measured from a start state: the total window starts before the operations of `from` (quota 1,
 * the Ibovespa of the previous trading day); the 12 months start at the end of `from`, close to close.
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
   * CDI_RETURN: the daily rates dated in [from, to); the rate of a day pays the night after it, so the one of `to` is
   * not earned by its end. Factors: the rates before each date, compounded.
   */
  cdiReturn(from: string, to: string): DerivedValue | null {
    if (this.cdi.countIn(from, to) === 0) {
      return null;
    }
    const start = this.cdi.factorBefore(from);
    const end = this.cdi.factorBefore(to);
    return derivedValue(
      'CDI_RETURN',
      percentChange(start, end),
      [
        marketInput('startFactor', start, from, 'BCB_SGS'),
        marketInput('endFactor', end, to, 'BCB_SGS'),
      ],
      this.asOf,
    );
  }

  /** IBOV_RETURN: points close to close; null when no point falls after the start. */
  ibovReturn(start: IndexPoint | null, to: string): DerivedValue | null {
    const end = this.ibov.atOrBefore(to);
    if (!start || !end || end.date === start.date) {
      return null;
    }
    return derivedValue(
      'IBOV_RETURN',
      percentChange(new Decimal(start.value), new Decimal(end.value)),
      [
        marketInput('startValue', start.value, start.date, 'B3_INDEX'),
        marketInput('endValue', end.value, end.date, 'B3_INDEX'),
      ],
      this.asOf,
    );
  }

  /**
   * IPCA_RETURN: the monthly rates of the whole months inside the window, without pro rata, up to the last month
   * published (the current month comes out only in the next one); dated by the first and the last month.
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
    if (this.ipca.countIn(first, endExclusive) === 0) {
      return null;
    }
    const start = this.ipca.factorBefore(first);
    const end = this.ipca.factorBefore(endExclusive);
    return derivedValue(
      'IPCA_RETURN',
      percentChange(start, end),
      [
        marketInput('startFactor', start, first, 'BCB_SGS'),
        marketInput('endFactor', end, plusMonths(endExclusive, -1), 'BCB_SGS'),
      ],
      this.asOf,
    );
  }
}

function comparison(
  window: Window,
  benchmarks: Benchmarks,
  asOf: LocalDate,
): ReturnComparison {
  return {
    from: window.from,
    to: window.to,
    value: derivedValue(
      'TWR',
      percentChange(window.startQuota, window.endQuota),
      [
        positionInput('startQuota', window.startQuota, window.from),
        positionInput('endQuota', window.endQuota, window.to),
      ],
      asOf,
    ),
    cdi: benchmarks.cdiReturn(window.from, window.to),
    ibov: benchmarks.ibovReturn(window.ibovStart, window.to),
    ipca: benchmarks.ipcaReturn(window.ipcaFrom, window.to),
  };
}

/**
 * B10: TWR of the portfolio over its whole history (from the first operation to the close date) and the last 12
 * months, next to CDI, Ibovespa and IPCA over the same windows, and the monthly chart of the total window. Price only:
 * no dividends until S6. `days` come from portfolioDays up to the close date; `firstOperationDate` dates the
 * 12-month availability when every operation is after the close date.
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
  const from = days[0].date;
  const last = days[days.length - 1];
  const totalWindow: Window = {
    from,
    to: last.date,
    startQuota: ONE,
    endQuota: last.quota,
    ibovStart: benchmarks.ibov.before(from),
    ipcaFrom: from,
  };
  const total = comparison(totalWindow, benchmarks, asOf);

  const points = monthEndDays(days);
  const series = points.map((day, index): ReturnPoint => ({
    date: day.date,
    value: percentChange(ONE, day.quota).toFixed(),
    cdi: benchmarks.cdiReturn(from, day.date)?.value ?? null,
    ibov: benchmarks.ibovReturn(totalWindow.ibovStart, day.date)?.value ?? null,
    ipca: benchmarks.ipcaPoint(from, day.date, index < points.length - 1),
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
      ipcaFrom: nextDay(yearAgo),
    },
    benchmarks,
    asOf,
  );
  return { total, last12Months, series };
}
