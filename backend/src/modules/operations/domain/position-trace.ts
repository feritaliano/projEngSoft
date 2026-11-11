import type { LocalDate } from '../../../shared/domain/local-date';
import { Money } from '../../../shared/domain/money';
import type { Quantity } from '../../../shared/domain/quantity';
import type { AssetRef, BrokerRef } from './catalog-refs';
import type {
  DerivedValue,
  DerivedValueInput,
  FormulaCode,
  InputName,
} from './derived-value';
import type {
  NonRealizingStep,
  Position,
  PositionStep,
  SellStep,
} from './position-calculator';
import type { BuyOperation, TimelineOperation } from './timeline';

/** What the trace needs besides the timeline: the day of the calculation (D54) and the broker names. */
export interface TraceContext {
  readonly asOf: LocalDate;
  readonly brokerOf: (brokerId: string) => BrokerRef;
}

interface PositionLineBase {
  readonly asset: AssetRef;
  /** POSITION_REALIZED_PROFIT: sum of every sale of the asset in the portfolio (RN06), "0" without sales. */
  readonly realizedProfit: DerivedValue;
}

export interface OpenPositionLine extends PositionLineBase {
  readonly status: 'OPEN';
  /** Decimal string (RN11). */
  readonly quantity: string;
  readonly averagePrice: DerivedValue;
  readonly totalCost: DerivedValue;
}

/** Quantity 0 and realized profit ≠ 0 (D41): no average price nor cost (RN08). */
export interface ClosedPositionLine extends PositionLineBase {
  readonly status: 'CLOSED';
  readonly quantity: '0';
  readonly averagePrice: null;
  readonly totalCost: null;
}

/** A row of the positions table (B6, frame 4), every number with its trace (D26). */
export type PositionLine = OpenPositionLine | ClosedPositionLine;

/** Totals of a portfolio (B7). */
export interface PortfolioTotals {
  /** PORTFOLIO_TOTAL_COST: one `positions` input per open position. */
  readonly totalCost: DerivedValue;
  /** PORTFOLIO_REALIZED_PROFIT: one `positions` input per line with realized profit ≠ 0; equals the sum of the lines. */
  readonly realizedProfit: DerivedValue;
  /** Open positions. */
  readonly assetCount: number;
}

type OperationInput = Extract<DerivedValueInput, { source: 'OPERATION' }>;

type BuyStep = NonRealizingStep & { readonly item: BuyOperation };

function derived(
  formulaCode: FormulaCode,
  value: Money | Quantity,
  inputs: readonly DerivedValueInput[],
  asOf: LocalDate,
): DerivedValue {
  return {
    value: value.toString(),
    formulaCode,
    asOf: asOf.toString(),
    inputs,
  };
}

/** Inputs taken from an operation (OPERATION source): its date, type and broker. */
function fromOperation(operation: TimelineOperation, context: TraceContext) {
  const ref = {
    id: operation.id,
    type: operation.type,
    broker: context.brokerOf(operation.brokerId),
  };
  return (name: InputName, value: Money | Quantity): OperationInput => ({
    name,
    value: value.toString(),
    source: 'OPERATION',
    referenceDate: operation.date.toString(),
    operation: ref,
  });
}

/** Inputs taken from the position at a date (POSITION source): "Suas operações até {data}". */
function atDate(date: LocalDate) {
  return (name: InputName, value: Money | Quantity): DerivedValueInput => ({
    name,
    value: value.toString(),
    source: 'POSITION',
    referenceDate: date.toString(),
  });
}

/** AVG_PRICE_BUY (RN05) by the last buy; `value` is the current PM, which sells do not change (RN06). */
function averagePriceTrace(
  lastBuy: BuyStep,
  averagePrice: Money,
  context: TraceContext,
): DerivedValue {
  const buy = lastBuy.item;
  const position = atDate(buy.date);
  const operation = fromOperation(buy, context);
  return derived(
    'AVG_PRICE_BUY',
    averagePrice,
    [
      position('quantityBefore', lastBuy.before.quantity),
      position('avgPriceBefore', lastBuy.before.averagePrice),
      operation('quantityBought', buy.quantity),
      operation('unitPrice', buy.unitPrice),
      operation('fees', buy.fees),
    ],
    context.asOf,
  );
}

/** TOTAL_COST = quantity × PM, linking to the PM trace. */
function totalCostTrace(
  position: Position,
  averagePrice: DerivedValue,
  asOf: LocalDate,
): DerivedValue {
  return derived(
    'TOTAL_COST',
    position.totalCost,
    [
      atDate(asOf)('quantity', position.quantity),
      {
        name: 'avgPrice',
        value: averagePrice.value,
        source: 'DERIVED',
        referenceDate: asOf.toString(),
        derived: averagePrice,
      },
    ],
    asOf,
  );
}

/** One `sales` input of POSITION_REALIZED_PROFIT, linking to the REALIZED_PROFIT (RN06) of the sale. */
function saleInput(step: SellStep, context: TraceContext): DerivedValueInput {
  const sale = step.item;
  const operation = fromOperation(sale, context);
  const realizedProfit = derived(
    'REALIZED_PROFIT',
    step.realizedProfit,
    [
      operation('quantitySold', sale.quantity),
      operation('unitPrice', sale.unitPrice),
      operation('fees', sale.fees),
      atDate(sale.date)('avgPriceAtSale', step.before.averagePrice),
    ],
    context.asOf,
  );
  return {
    ...operation('sales', step.realizedProfit),
    derived: realizedProfit,
  };
}

/**
 * The positions-table row of one asset from its calculated timeline (RN09, D4), or null for a closed position with
 * realized profit exactly 0 (D41: it is not shown). Throws on a corporate event (no trace until S2) and on an open
 * position without a buy.
 */
export function positionLine(
  asset: AssetRef,
  position: Position,
  steps: readonly PositionStep[],
  context: TraceContext,
): PositionLine | null {
  let lastBuy: BuyStep | undefined;
  const sales: DerivedValueInput[] = [];
  for (const step of steps) {
    if (step.realizedProfit !== null) {
      sales.push(saleInput(step, context));
    } else if (step.item.kind === 'operation') {
      // A non-realizing step whose item is an operation is a buy; TS narrows the item, not the step.
      lastBuy = step as BuyStep;
    } else {
      // shortcut: a corporate event changes the PM with no formula traced yet; S2 adds it, until then fail loudly
      // instead of serving a PM trace that does not explain the value.
      throw new Error(
        `Corporate event ${step.item.id} of asset ${asset.id} has no trace yet (S2)`,
      );
    }
  }
  const realizedProfit = derived(
    'POSITION_REALIZED_PROFIT',
    position.realizedProfit,
    sales,
    context.asOf,
  );
  if (position.quantity.isZero()) {
    return position.realizedProfit.isZero()
      ? null
      : {
          asset,
          status: 'CLOSED',
          quantity: '0',
          averagePrice: null,
          totalCost: null,
          realizedProfit,
        };
  }
  if (!lastBuy) {
    throw new Error(
      `Open position of asset ${asset.id} without a buy in its timeline`,
    );
  }
  const averagePrice = averagePriceTrace(
    lastBuy,
    position.averagePrice,
    context,
  );
  return {
    asset,
    status: 'OPEN',
    quantity: position.quantity.toString(),
    averagePrice,
    totalCost: totalCostTrace(position, averagePrice, context.asOf),
    realizedProfit,
  };
}

/** Sum of per-asset values as a portfolio total, one `positions` input (ASSET_POSITION) per line. */
function portfolioSum<Line extends PositionLine>(
  formulaCode: FormulaCode,
  lines: readonly Line[],
  valueOf: (line: Line) => DerivedValue,
  asOf: LocalDate,
): DerivedValue {
  let total = Money.zero();
  const inputs = lines.map((line): DerivedValueInput => {
    const value = valueOf(line);
    total = total.plus(Money.of(value.value));
    return {
      name: 'positions',
      value: value.value,
      source: 'ASSET_POSITION',
      referenceDate: asOf.toString(),
      asset: { ...line.asset, status: line.status },
      derived: value,
    };
  });
  return derived(formulaCode, total, inputs, asOf);
}

function isOpen(line: PositionLine): line is OpenPositionLine {
  return line.status === 'OPEN';
}

/**
 * B7 from the rows of the positions table, so the realized profit equals the sum of the rows (D41): cost of the open
 * positions; realized profit of the rows with profit ≠ 0, open or closed.
 */
export function portfolioTotals(
  lines: readonly PositionLine[],
  asOf: LocalDate,
): PortfolioTotals {
  const open = lines.filter(isOpen);
  const withProfit = lines.filter(
    (line) => !Money.of(line.realizedProfit.value).isZero(),
  );
  return {
    totalCost: portfolioSum(
      'PORTFOLIO_TOTAL_COST',
      open,
      (line) => line.totalCost,
      asOf,
    ),
    realizedProfit: portfolioSum(
      'PORTFOLIO_REALIZED_PROFIT',
      withProfit,
      (line) => line.realizedProfit,
      asOf,
    ),
    assetCount: open.length,
  };
}
