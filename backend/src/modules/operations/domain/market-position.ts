import { Decimal, toDecimal } from '../../../shared/domain/decimal';
import type { LocalDate } from '../../../shared/domain/local-date';
import type {
  ClosePoint,
  MarketDataSource,
} from '../../market-data/domain/market-data';
import { ASSET_TYPES, AssetType } from './asset-type';
import type { DerivedValue, DerivedValueInput } from './derived-value';
import {
  derivedInput,
  derivedValue,
  marketInput,
  positionInput,
} from './market-trace';
import type { PositionStep } from './position-calculator';
import { AssetHistory, flowOf } from './portfolio-history';
import {
  ClosedPositionLine,
  isOpen,
  OpenPositionLine,
  PortfolioTotals,
  PositionLine,
  portfolioSum,
} from './position-trace';

/** A close as published (not derived): value, trading day and source (D27). */
export interface ClosePrice {
  readonly value: string;
  readonly date: string;
  readonly source: MarketDataSource;
}

interface OpenMarket {
  /** Null without quote, with unavailableReason NO_QUOTE. */
  readonly lastClose: ClosePrice | null;
  readonly unavailableReason?: 'NO_QUOTE';
  /** MARKET_VALUE, or MARKET_VALUE_AT_COST without quote. */
  readonly marketValue: DerivedValue;
  readonly unrealizedProfit: DerivedValue | null;
  readonly unrealizedProfitPercent: DerivedValue | null;
  readonly dayChange: DerivedValue | null;
  readonly dayChangePercent: DerivedValue | null;
  readonly portfolioWeight: DerivedValue;
}

/** A closed position has no market number (D41), like its average price. */
interface ClosedMarket {
  readonly lastClose: null;
  readonly unavailableReason?: never;
  readonly marketValue: null;
  readonly unrealizedProfit: null;
  readonly unrealizedProfitPercent: null;
  readonly dayChange: null;
  readonly dayChangePercent: null;
  readonly portfolioWeight: null;
}

export type OpenMarketLine = OpenPositionLine & OpenMarket;
export type MarketPositionLine =
  OpenMarketLine | (ClosedPositionLine & ClosedMarket);

const ZERO = new Decimal(0);
const HUNDRED = new Decimal(100);

const percentOf = (part: Decimal, whole: Decimal) =>
  part.dividedBy(whole).times(HUNDRED);

const decimalOf = (derived: DerivedValue) => new Decimal(derived.value);

/** Units held at the end of `date` (operations up to it). */
function quantityAt(steps: readonly PositionStep[], date: string): Decimal {
  let quantity = ZERO;
  for (const step of steps) {
    if (step.item.date.toString() > date) break;
    quantity = step.after.quantity.value;
  }
  return quantity;
}

/** MARKET_VALUE = quantity × close; the quantity from the operations up to `quantityDate`. */
function marketValueTrace(
  quantity: Decimal,
  quantityDate: string,
  close: ClosePoint,
  asOf: LocalDate,
): DerivedValue {
  return derivedValue(
    'MARKET_VALUE',
    quantity.times(toDecimal(close.close, 'close')),
    [
      positionInput('quantity', quantity, quantityDate),
      marketInput('lastClose', close.close, close.date, 'B3_COTAHIST'),
    ],
    asOf,
  );
}

/** The last close up to `date`, or null. */
function closeAtOrBefore(
  closes: readonly ClosePoint[],
  date: string,
): ClosePoint | null {
  let found: ClosePoint | null = null;
  for (const close of closes) {
    if (close.date > date) break;
    found = close;
  }
  return found;
}

/** The trading days of the day change: the close date and the market's trading day before it (null if none). */
export interface MarketClosing {
  readonly closeDate: string;
  readonly previousCloseDate: string | null;
}

/**
 * POSITION_DAY_CHANGE over the close date, against the market's previous trading day: value now (units on the close
 * date × the last close up to it) − value before (units on the previous trading day × the last close up to it) − buys
 * + sales after the previous trading day up to the close date (a day without trading in between belongs to the day).
 * A buy counts at its executed price plus fees, a sale at its net amount (F17), so an asset that did not trade and
 * had no operation changes 0. Null when units were held on the previous trading day without any close up to it (no
 * value to start from); operations after the close date do not enter.
 */
function dayChangeOf(
  market: AssetHistory,
  last: ClosePoint,
  { closeDate, previousCloseDate }: MarketClosing,
  asOf: LocalDate,
): Pick<OpenMarket, 'dayChange' | 'dayChangePercent'> {
  const { steps, closes } = market;
  const previousUnits =
    previousCloseDate === null ? ZERO : quantityAt(steps, previousCloseDate);
  const previous =
    previousCloseDate === null
      ? null
      : closeAtOrBefore(closes, previousCloseDate);
  if (!previousUnits.isZero() && !previous) {
    return { dayChange: null, dayChangePercent: null };
  }
  let buys = ZERO;
  let sales = ZERO;
  for (const step of steps) {
    const date = step.item.date.toString();
    const afterPrevious =
      previousCloseDate === null || date > previousCloseDate;
    if (afterPrevious && date <= closeDate) {
      const flow = flowOf(step);
      buys = buys.plus(flow.buys);
      sales = sales.plus(flow.sales);
    }
  }
  const now = marketValueTrace(
    quantityAt(steps, closeDate),
    closeDate,
    last,
    asOf,
  );
  const before: DerivedValueInput =
    previous && previousCloseDate
      ? derivedInput(
          'previousMarketValue',
          marketValueTrace(previousUnits, previousCloseDate, previous, asOf),
          previousCloseDate,
        )
      : positionInput(
          'previousMarketValue',
          ZERO,
          previousCloseDate ?? closeDate,
        );
  const beforeValue = new Decimal(before.value);
  const dayBuys = positionInput('dayBuys', buys, closeDate);
  const dayChange = derivedValue(
    'POSITION_DAY_CHANGE',
    decimalOf(now).minus(beforeValue).minus(buys).plus(sales),
    [
      derivedInput('marketValue', now, closeDate),
      before,
      dayBuys,
      positionInput('daySales', sales, closeDate),
    ],
    asOf,
  );
  const base = beforeValue.plus(buys);
  return {
    dayChange,
    dayChangePercent: base.isZero()
      ? null
      : derivedValue(
          'POSITION_DAY_CHANGE_PERCENT',
          percentOf(decimalOf(dayChange), base),
          [derivedInput('dayChange', dayChange, closeDate), before, dayBuys],
          asOf,
        ),
  };
}

/** B8 of an open position, the weight apart (it needs the equity). */
function valueOpenLine(
  line: OpenPositionLine,
  market: AssetHistory,
  closing: MarketClosing | null,
  asOf: LocalDate,
): Omit<OpenMarket, 'portfolioWeight'> {
  const today = asOf.toString();
  const last = market.closes[market.closes.length - 1];
  if (!last || closing === null) {
    return {
      lastClose: null,
      unavailableReason: 'NO_QUOTE',
      marketValue: derivedValue(
        'MARKET_VALUE_AT_COST',
        decimalOf(line.totalCost),
        [derivedInput('totalCost', line.totalCost, today)],
        asOf,
      ),
      unrealizedProfit: null,
      unrealizedProfitPercent: null,
      dayChange: null,
      dayChangePercent: null,
    };
  }
  const marketValue = marketValueTrace(
    new Decimal(line.quantity),
    today,
    last,
    asOf,
  );
  const totalCost = derivedInput('totalCost', line.totalCost, today);
  const unrealizedProfit = derivedValue(
    'UNREALIZED_PROFIT',
    decimalOf(marketValue).minus(decimalOf(line.totalCost)),
    [derivedInput('marketValue', marketValue, today), totalCost],
    asOf,
  );
  return {
    lastClose: { value: last.close, date: last.date, source: 'B3_COTAHIST' },
    marketValue,
    unrealizedProfit,
    unrealizedProfitPercent: derivedValue(
      'UNREALIZED_PROFIT_PERCENT',
      percentOf(decimalOf(unrealizedProfit), decimalOf(line.totalCost)),
      [derivedInput('unrealizedProfit', unrealizedProfit, today), totalCost],
      asOf,
    ),
    ...dayChangeOf(market, last, closing, asOf),
  };
}

const CLOSED_MARKET: ClosedMarket = {
  lastClose: null,
  marketValue: null,
  unrealizedProfit: null,
  unrealizedProfitPercent: null,
  dayChange: null,
  dayChangePercent: null,
  portfolioWeight: null,
};

/** The classes of the open lines by the sum of their market value descending, a tie by ASSET_TYPES (D63). */
function classesByValue(lines: readonly OpenMarketLine[]): AssetType[] {
  const classValue = new Map<AssetType, Decimal>();
  for (const line of lines) {
    const type = line.asset.assetType;
    classValue.set(
      type,
      (classValue.get(type) ?? ZERO).plus(decimalOf(line.marketValue)),
    );
  }
  return [...classValue.keys()].sort(
    (a, b) =>
      classValue.get(b)!.comparedTo(classValue.get(a)!) ||
      ASSET_TYPES.indexOf(a) - ASSET_TYPES.indexOf(b),
  );
}

/**
 * D63 with market values (D64): open lines first, their classes by market value descending (at cost without quote),
 * a tie by the fixed order of ASSET_TYPES; closed lines after, by that fixed order; display name within a class.
 */
function byClassValueThenName(
  lines: readonly MarketPositionLine[],
): (a: MarketPositionLine, b: MarketPositionLine) => number {
  const openClasses = classesByValue(lines.filter(isOpenMarket));
  const rank = (line: MarketPositionLine) =>
    line.status === 'OPEN'
      ? openClasses.indexOf(line.asset.assetType)
      : openClasses.length + ASSET_TYPES.indexOf(line.asset.assetType);
  return (a, b) =>
    rank(a) - rank(b) ||
    a.asset.displayName.localeCompare(b.asset.displayName, 'pt-BR');
}

function isOpenMarket(line: MarketPositionLine): line is OpenMarketLine {
  return line.status === 'OPEN';
}

/**
 * B8: market numbers of each position of a portfolio, from the last close up to the close date (a day without trading
 * uses the previous one); any asset without a close up to it at cost with NO_QUOTE (fixed income and crypto until S11,
 * D55). Market value, gain and weight use the current quantity (operations up to today). `closing` is null before any
 * quote is loaded. Returns the lines in the order of D63 and PORTFOLIO_EQUITY.
 */
export function marketPositions(
  lines: readonly PositionLine[],
  marketOf: (assetId: string) => AssetHistory,
  closing: MarketClosing | null,
  asOf: LocalDate,
): { lines: MarketPositionLine[]; equity: DerivedValue } {
  const open = lines.filter(isOpen).map((line) => ({
    ...line,
    ...valueOpenLine(line, marketOf(line.asset.id), closing, asOf),
  }));
  const equity = portfolioSum(
    'PORTFOLIO_EQUITY',
    open,
    (line) => line.marketValue,
    asOf,
  );
  const today = asOf.toString();
  const result: MarketPositionLine[] = [
    ...open.map((line) => ({
      ...line,
      portfolioWeight: derivedValue(
        'PORTFOLIO_WEIGHT',
        percentOf(decimalOf(line.marketValue), decimalOf(equity)),
        [
          derivedInput('marketValue', line.marketValue, today),
          derivedInput('equity', equity, today),
        ],
        asOf,
      ),
    })),
    ...lines
      .filter((line): line is ClosedPositionLine => !isOpen(line))
      .map((line) => ({ ...line, ...CLOSED_MARKET })),
  ];
  return { lines: result.sort(byClassValueThenName(result)), equity };
}

/** B7 with market values: the equity and the gain over the total cost of the open positions. */
export interface MarketTotals extends PortfolioTotals {
  readonly equity: DerivedValue;
  readonly unrealizedProfit: DerivedValue;
  /** Null without open positions. */
  readonly unrealizedProfitPercent: DerivedValue | null;
}

export function marketTotals(
  totals: PortfolioTotals,
  equity: DerivedValue,
  asOf: LocalDate,
): MarketTotals {
  const today = asOf.toString();
  const totalCost = derivedInput('totalCost', totals.totalCost, today);
  const unrealizedProfit = derivedValue(
    'PORTFOLIO_UNREALIZED_PROFIT',
    decimalOf(equity).minus(decimalOf(totals.totalCost)),
    [derivedInput('equity', equity, today), totalCost],
    asOf,
  );
  const cost = decimalOf(totals.totalCost);
  return {
    ...totals,
    equity,
    unrealizedProfit,
    unrealizedProfitPercent: cost.isZero()
      ? null
      : derivedValue(
          'PORTFOLIO_UNREALIZED_PROFIT_PERCENT',
          percentOf(decimalOf(unrealizedProfit), cost),
          [
            derivedInput('unrealizedProfit', unrealizedProfit, today),
            totalCost,
          ],
          asOf,
        ),
  };
}

export interface AllocationGroup {
  readonly value: DerivedValue;
  readonly percent: DerivedValue;
}

export interface PortfolioAllocation {
  readonly byClass: (AllocationGroup & { assetType: AssetType })[];
  readonly bySector: (AllocationGroup & { sector: string | null })[];
}

/**
 * B9: the open positions by class (in the order of the positions, D63) and by sector of the issuer (by value, a tie
 * by name, the group without sector last), each with ALLOCATION_VALUE and ALLOCATION_PERCENT over the equity.
 */
export function marketAllocation(
  lines: readonly MarketPositionLine[],
  equity: DerivedValue,
  sectorOf: (assetId: string) => string | null,
  asOf: LocalDate,
): PortfolioAllocation {
  const open = lines.filter(isOpenMarket);
  const today = asOf.toString();
  const group = (members: readonly OpenMarketLine[]): AllocationGroup => {
    const value = portfolioSum(
      'ALLOCATION_VALUE',
      members,
      (line) => line.marketValue,
      asOf,
    );
    return {
      value,
      percent: derivedValue(
        'ALLOCATION_PERCENT',
        percentOf(decimalOf(value), decimalOf(equity)),
        [
          derivedInput('groupValue', value, today),
          derivedInput('equity', equity, today),
        ],
        asOf,
      ),
    };
  };
  const sectors = [...new Set(open.map((line) => sectorOf(line.asset.id)))];
  const bySector = sectors.map((sector) => ({
    sector,
    ...group(open.filter((line) => sectorOf(line.asset.id) === sector)),
  }));
  bySector.sort((a, b) =>
    a.sector === null || b.sector === null
      ? Number(a.sector === null) - Number(b.sector === null)
      : decimalOf(b.value).comparedTo(decimalOf(a.value)) ||
        a.sector.localeCompare(b.sector, 'pt-BR'),
  );
  return {
    byClass: classesByValue(open).map((assetType) => ({
      assetType,
      ...group(open.filter((line) => line.asset.assetType === assetType)),
    })),
    bySector,
  };
}

/** USER_EQUITY: the equity of every portfolio of the user, one `portfolios` input per portfolio; "0" without any. */
export function userEquity(
  portfolios: readonly {
    readonly id: string;
    readonly name: string;
    readonly equity: DerivedValue;
  }[],
  asOf: LocalDate,
): DerivedValue {
  return derivedValue(
    'USER_EQUITY',
    portfolios.reduce((sum, { equity }) => sum.plus(decimalOf(equity)), ZERO),
    portfolios.map(({ id, name, equity }) => ({
      name: 'portfolios',
      value: equity.value,
      source: 'PORTFOLIO',
      referenceDate: asOf.toString(),
      portfolio: { id, name },
      derived: equity,
    })),
    asOf,
  );
}
