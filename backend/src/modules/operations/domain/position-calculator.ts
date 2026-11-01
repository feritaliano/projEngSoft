import { DomainError } from '../../../shared/domain/domain-error';
import { Money } from '../../../shared/domain/money';
import { Quantity } from '../../../shared/domain/quantity';
import {
  BuyOperation,
  compareTimelineItems,
  SellOperation,
  TimelineCorporateEvent,
  TimelineItem,
} from './timeline';

/** Quantity, total cost and average price at a point of the timeline. */
export interface PositionState {
  readonly quantity: Quantity;
  /** What was invested in the units held, fees included (RN05). Zero when no units are held (RN08). */
  readonly totalCost: Money;
  /** totalCost ÷ quantity; zero when no units are held (RN08). */
  readonly averagePrice: Money;
}

interface StepBase {
  readonly before: PositionState;
  readonly after: PositionState;
}

/** A sell and its realized profit (RN06); `before.averagePrice` is the PM at the sale (REALIZED_PROFIT trace). */
export interface SellStep extends StepBase {
  readonly item: SellOperation;
  readonly realizedProfit: Money;
}

/** A buy or corporate event: changes the position, realizes nothing. */
export interface NonRealizingStep extends StepBase {
  readonly item: BuyOperation | TimelineCorporateEvent;
  readonly realizedProfit: null;
}

/** Effect of one timeline item: the inputs of the "como foi calculado" trace (D26) and of the preview (D42). */
export type PositionStep = SellStep | NonRealizingStep;

/** Derived position (D4): never stored, always recalculated from the timeline (RN09). */
export interface Position extends PositionState {
  /** Sum of the realized profit of every sell (RN06); kept after the position is closed. */
  readonly realizedProfit: Money;
}

/**
 * RN07/RN10: a sell above the quantity held at its point of the timeline. Identifies the chronologically first
 * offending sell, which is what the 422 (and the preview `violation`) report: id, date, available vs. sold quantity.
 */
export class NegativePositionError extends DomainError {
  readonly code = 'NEGATIVE_POSITION';

  constructor(
    readonly operation: SellOperation,
    readonly availableQuantity: Quantity,
  ) {
    super(
      `Sell ${operation.id} of ${operation.quantity.toString()} on ${operation.date.toString()} exceeds the ` +
        `${availableQuantity.toString()} units held at that point`,
    );
  }

  get soldQuantity(): Quantity {
    return this.operation.quantity;
  }
}

export type PositionCalculation =
  | {
      readonly ok: true;
      readonly position: Position;
      readonly steps: readonly PositionStep[];
    }
  | {
      readonly ok: false;
      readonly error: NegativePositionError;
      /** Steps applied before the offending sell. */
      readonly steps: readonly PositionStep[];
    };

const EMPTY: PositionState = Object.freeze({
  quantity: Quantity.zero(),
  totalCost: Money.zero(),
  averagePrice: Money.zero(),
});

/**
 * The total cost is what is carried from step to step; the average price is derived at each point. Buys, splits and
 * bonuses then only add or keep amounts (exact), and only a sell divides.
 */
function stateOf(quantity: Quantity, totalCost: Money): PositionState {
  if (quantity.isZero()) {
    return EMPTY;
  }
  return {
    quantity,
    totalCost,
    averagePrice: totalCost.dividedBy(quantity.value),
  };
}

/** RN05: PM = (held × PM + bought × price + fees) ÷ (held + bought), i.e. (total cost + price × bought + fees) ÷ units. */
function applyBuy(state: PositionState, buy: BuyOperation): PositionState {
  return stateOf(
    state.quantity.plus(buy.quantity),
    state.totalCost
      .plus(buy.unitPrice.times(buy.quantity.value))
      .plus(buy.fees),
  );
}

/**
 * RN06: profit = sold × price − fees − sold × PM, and the PM does not change: the units left keep their share of the
 * cost (PM × units left). RN08: selling everything resets cost and PM to zero.
 */
function applySell(
  state: PositionState,
  sell: SellOperation,
): { after: PositionState; realizedProfit: Money } {
  const sold = sell.quantity.value;
  const realizedProfit = sell.unitPrice
    .times(sold)
    .minus(sell.fees)
    .minus(state.averagePrice.times(sold));
  const quantity = state.quantity.minus(sell.quantity);
  return {
    after: stateOf(quantity, state.averagePrice.times(quantity.value)),
    realizedProfit,
  };
}

function unexpectedItem(item: never): never {
  throw new TypeError(
    `Unknown timeline item: build items with timelineOperation/corporateEvent (${JSON.stringify(item)})`,
  );
}

/**
 * D29: units become units × to ÷ from. Split and reverse split keep the total cost (only the PM changes); a bonus adds
 * the new units at the bonus unit cost. With no units held, the event changes nothing.
 */
function applyCorporateEvent(
  state: PositionState,
  event: TimelineCorporateEvent,
): PositionState {
  if (state.quantity.isZero()) {
    return state;
  }
  // Multiply before dividing, so e.g. 300 units in a 3 → 1 reverse split give exactly 100.
  const quantity = Quantity.of(
    state.quantity.value.times(event.ratioTo).dividedBy(event.ratioFrom),
  );
  switch (event.type) {
    case 'SPLIT':
    case 'REVERSE_SPLIT':
      return stateOf(quantity, state.totalCost);
    case 'BONUS': {
      const bonusUnits = quantity.minus(state.quantity);
      return stateOf(
        quantity,
        state.totalCost.plus(event.bonusUnitCost.times(bonusUnits.value)),
      );
    }
    default:
      return unexpectedItem(event);
  }
}

/**
 * Position of one asset from its timeline (RN05–RN10, D29). Pure and non-mutating: the caller chooses the items (a
 * portfolio's operations in S1, all of a user's operations for IR in S7, plus the asset's corporate events from S2)
 * and the function sorts a copy chronologically (RN09). Brokers do not matter (RN12). A sell above the units held at
 * its point of the timeline makes the whole calculation fail (RN07, RN10), identifying the first such sell.
 */
export function calculatePosition(
  items: readonly TimelineItem[],
): PositionCalculation {
  const steps: PositionStep[] = [];
  let state = EMPTY;
  let realizedProfit = Money.zero();

  for (const item of [...items].sort(compareTimelineItems)) {
    const before = state;
    if (item.kind === 'corporate-event') {
      state = applyCorporateEvent(state, item);
      steps.push({ item, before, after: state, realizedProfit: null });
      continue;
    }
    switch (item.type) {
      case 'BUY':
        state = applyBuy(state, item);
        steps.push({ item, before, after: state, realizedProfit: null });
        break;
      case 'SELL': {
        if (item.quantity.isGreaterThan(state.quantity)) {
          return {
            ok: false,
            error: new NegativePositionError(item, state.quantity),
            steps,
          };
        }
        const sale = applySell(state, item);
        state = sale.after;
        realizedProfit = realizedProfit.plus(sale.realizedProfit);
        steps.push({
          item,
          before,
          after: state,
          realizedProfit: sale.realizedProfit,
        });
        break;
      }
      default:
        return unexpectedItem(item);
    }
  }

  return {
    ok: true,
    position: { ...state, realizedProfit },
    steps,
  };
}
