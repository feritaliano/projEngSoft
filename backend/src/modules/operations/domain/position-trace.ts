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
import { ChangeEvaluation, savedIdOf } from './timeline-change';

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
    id: savedIdOf(operation),
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

/** REALIZED_PROFIT (RN06) of one sale, with the PM at its date. */
function realizedProfitTrace(
  step: SellStep,
  context: TraceContext,
): DerivedValue {
  const sale = step.item;
  const operation = fromOperation(sale, context);
  return derived(
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
}

/** One `sales` input of POSITION_REALIZED_PROFIT, linking to the REALIZED_PROFIT of the sale. */
function saleInput(step: SellStep, context: TraceContext): DerivedValueInput {
  return {
    ...fromOperation(step.item, context)('sales', step.realizedProfit),
    derived: realizedProfitTrace(step, context),
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

/** The Resumo da operação (D42, frame 5): what the operation is worth and how it changes the position at its date. */
export interface OperationPreview {
  /** OPERATION_GROSS. */
  readonly grossAmount: DerivedValue;
  /** OPERATION_TOTAL_BUY on a buy, OPERATION_NET_SELL on a sell. */
  readonly netAmount: DerivedValue;
  /**
   * Units held at the date of the operation, before it (decimal string, RN11). Null, like every value of the position,
   * when the timeline breaks at an earlier sell: an edit that moves a buy past a sell that needed it (RN10).
   */
  readonly positionBefore: string | null;
  /** Null when the operation is itself the offending sell (RN07). */
  readonly positionAfter: string | null;
  /** AVG_PRICE_BUY; null without units (RN08). */
  readonly averagePriceBefore: DerivedValue | null;
  readonly averagePriceAfter: DerivedValue | null;
  /** REALIZED_PROFIT, sells only (absent on a buy); null when the sell is the offending one (RN07). */
  readonly realizedProfit?: DerivedValue | null;
}

/** The last buy among the steps: the one that set the PM (RN05; sells keep it, RN06). */
function lastBuyOf(steps: readonly PositionStep[]): BuyStep {
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const step = steps[i];
    if (step.item.kind === 'corporate-event') {
      // shortcut: as in positionLine, an event changes the PM with no formula traced until S2: fail loudly.
      throw new Error(`Corporate event ${step.item.id} has no trace yet (S2)`);
    }
    if (step.realizedProfit === null) {
      return step as BuyStep;
    }
  }
  throw new Error('Units held without a buy in the timeline');
}

/** AVG_PRICE_BUY after the last of `steps`; null when no units are held there (RN08). */
function averagePriceAfter(
  steps: readonly PositionStep[],
  context: TraceContext,
): DerivedValue | null {
  const state = steps.length > 0 ? steps[steps.length - 1].after : null;
  return state && !state.quantity.isZero()
    ? averagePriceTrace(lastBuyOf(steps), state.averagePrice, context)
    : null;
}

/** OPERATION_GROSS and, from it, OPERATION_TOTAL_BUY or OPERATION_NET_SELL: values of the operation alone. */
function operationAmounts(
  operation: TimelineOperation,
  context: TraceContext,
): Pick<OperationPreview, 'grossAmount' | 'netAmount'> {
  const fromForm = fromOperation(operation, context);
  const gross = operation.unitPrice.times(operation.quantity.value);
  const grossAmount = derived(
    'OPERATION_GROSS',
    gross,
    [
      fromForm('quantity', operation.quantity),
      fromForm('unitPrice', operation.unitPrice),
    ],
    context.asOf,
  );
  const inputs: DerivedValueInput[] = [
    {
      name: 'grossValue',
      value: grossAmount.value,
      source: 'DERIVED',
      referenceDate: operation.date.toString(),
      derived: grossAmount,
    },
    fromForm('fees', operation.fees),
  ];
  const netAmount =
    operation.type === 'BUY'
      ? derived(
          'OPERATION_TOTAL_BUY',
          gross.plus(operation.fees),
          inputs,
          context.asOf,
        )
      : derived(
          'OPERATION_NET_SELL',
          gross.minus(operation.fees),
          inputs,
          context.asOf,
        );
  return { grossAmount, netAmount };
}

/**
 * D42: the Resumo da operação of `operation` from the evaluation of its timeline with it (evaluateChange, the same
 * calculation as the command), before and after it at its date. Without a step of its own, the timeline stopped at it
 * (RN07: only the values before it are known) or at an earlier sell (none of the position is).
 */
export function operationPreview(
  operation: TimelineOperation,
  evaluation: ChangeEvaluation,
  context: TraceContext,
): OperationPreview {
  const amounts = operationAmounts(operation, context);
  const { steps } = evaluation;
  const index = steps.findIndex(
    (step) => step.item.kind === 'operation' && step.item.id === operation.id,
  );

  if (index >= 0) {
    const step = steps[index];
    return {
      ...amounts,
      positionBefore: step.before.quantity.toString(),
      positionAfter: step.after.quantity.toString(),
      averagePriceBefore: averagePriceAfter(steps.slice(0, index), context),
      averagePriceAfter: averagePriceAfter(steps.slice(0, index + 1), context),
      ...(step.realizedProfit !== null && {
        realizedProfit: realizedProfitTrace(step, context),
      }),
    };
  }

  if (evaluation.ok) {
    // A successful calculation applies every item: missing the operation means it was not in the change.
    throw new Error(
      `Operation ${operation.id} is not in its evaluated timeline`,
    );
  }
  const atIt =
    evaluation.violation.operation.id === operation.id
      ? evaluation.violation
      : null;
  return {
    ...amounts,
    positionBefore: atIt ? atIt.availableQuantity.toString() : null,
    positionAfter: null,
    averagePriceBefore: atIt ? averagePriceAfter(steps, context) : null,
    averagePriceAfter: null,
    ...(operation.type === 'SELL' && { realizedProfit: null }),
  };
}
