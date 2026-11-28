import { Decimal, toDecimal } from '../../../shared/domain/decimal';
import type { ClosePoint } from '../../market-data/domain/market-data';
import type { PositionState, PositionStep } from './position-calculator';

/** One asset of a portfolio: the steps of its timeline (calculatePosition, chronological) and its closes, oldest first. */
export interface AssetHistory {
  readonly steps: readonly PositionStep[];
  readonly closes: readonly ClosePoint[];
}

/** The portfolio at the end of an evaluation day (D4: computed on read, never stored). */
export interface PortfolioDay {
  /** YYYY-MM-DD. */
  readonly date: string;
  /** As PORTFOLIO_EQUITY: units held × last close up to the date; at cost without a close (D55). */
  readonly equity: Decimal;
  /** As PORTFOLIO_TOTAL_COST: cost of the units held (RN05, RN06). */
  readonly invested: Decimal;
  /** TWR quota after the day, base 1 before the first operation. */
  readonly quota: Decimal;
}

const ZERO = new Decimal(0);
const ONE = new Decimal(1);

/** Money in of a buy (quantity × executed price + fees) or money out of a sale (quantity × price − fees). */
export function flowOf(step: PositionStep): { buys: Decimal; sales: Decimal } {
  const item = step.item;
  if (item.kind === 'corporate-event') {
    // shortcut: closes are not adjusted (D64b) and events have no market treatment until S2 (E1): fail loudly.
    throw new Error(
      `Corporate event ${item.id} has no market treatment yet (S2)`,
    );
  }
  const gross = item.unitPrice.times(item.quantity.value);
  return item.type === 'BUY'
    ? { buys: gross.plus(item.fees).value, sales: ZERO }
    : { buys: ZERO, sales: gross.minus(item.fees).value };
}

interface Track {
  readonly steps: readonly PositionStep[];
  readonly closes: readonly { date: string; close: Decimal }[];
  nextStep: number;
  nextClose: number;
  state: PositionState | null;
  close: Decimal | null;
}

/**
 * The portfolio day by day, from its first operation to `until` (the close date): every trading day of its assets,
 * every operation date (a day without trading is valued by the previous close) and `until`. Operations after `until`
 * do not enter. The day return is (equity − previous equity − buys + sales) ÷ (previous equity + buys): buys count from
 * their executed price, so buying at 10 a stock that closes at 12 is +20% (F17), and sales count at the end of the day;
 * with nothing held and nothing bought the quota stays. Without dividends until S6.
 */
export function portfolioDays(
  assets: readonly AssetHistory[],
  until: string,
): PortfolioDay[] {
  const tracks: Track[] = assets.map((asset) => ({
    steps: asset.steps,
    closes: asset.closes.map((point) => ({
      date: point.date,
      close: toDecimal(point.close, 'close'),
    })),
    nextStep: 0,
    nextClose: 0,
    state: null,
    close: null,
  }));
  const operationDates = tracks.flatMap((track) =>
    track.steps.map((step) => step.item.date.toString()),
  );
  const first = operationDates.reduce<string | null>(
    (min, date) => (min === null || date < min ? date : min),
    null,
  );
  if (first === null || first > until) {
    return [];
  }
  const dates = new Set([until]);
  for (const date of operationDates) {
    if (date <= until) dates.add(date);
  }
  for (const track of tracks) {
    for (const { date } of track.closes) {
      if (date >= first && date <= until) dates.add(date);
    }
  }

  const days: PortfolioDay[] = [];
  let quota = ONE;
  let previousEquity = ZERO;
  for (const date of [...dates].sort()) {
    let buys = ZERO;
    let sales = ZERO;
    let equity = ZERO;
    let invested = ZERO;
    for (const track of tracks) {
      while (
        track.nextStep < track.steps.length &&
        track.steps[track.nextStep].item.date.toString() <= date
      ) {
        const step = track.steps[track.nextStep++];
        const flow = flowOf(step);
        buys = buys.plus(flow.buys);
        sales = sales.plus(flow.sales);
        track.state = step.after;
      }
      while (
        track.nextClose < track.closes.length &&
        track.closes[track.nextClose].date <= date
      ) {
        track.close = track.closes[track.nextClose++].close;
      }
      if (track.state && !track.state.quantity.isZero()) {
        const cost = track.state.totalCost.value;
        invested = invested.plus(cost);
        equity = equity.plus(
          track.close ? track.state.quantity.value.times(track.close) : cost,
        );
      }
    }
    const base = previousEquity.plus(buys);
    if (!base.isZero()) {
      const gain = equity.minus(previousEquity).minus(buys).plus(sales);
      quota = quota.times(ONE.plus(gain.dividedBy(base)));
    }
    days.push({ date, equity, invested, quota });
    previousEquity = equity;
  }
  return days;
}

/** The quota at the end of `date`: of the last evaluation day up to it, 1 before the first operation. */
export function quotaAt(days: readonly PortfolioDay[], date: string): Decimal {
  let quota = ONE;
  for (const day of days) {
    if (day.date > date) break;
    quota = day.quota;
  }
  return quota;
}

/** The last evaluation day of each month (the chart points of B10 and B11); the last one is the close date. */
export function monthEndDays(days: readonly PortfolioDay[]): PortfolioDay[] {
  return days.filter(
    (day, index) =>
      index === days.length - 1 ||
      days[index + 1].date.slice(0, 7) !== day.date.slice(0, 7),
  );
}
