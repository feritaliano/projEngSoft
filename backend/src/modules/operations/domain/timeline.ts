import {
  Decimal,
  DecimalInput,
  toDecimal,
} from '../../../shared/domain/decimal';
import { InvalidValueError } from '../../../shared/domain/domain-error';
import { LocalDate } from '../../../shared/domain/local-date';
import { Money } from '../../../shared/domain/money';
import { Quantity } from '../../../shared/domain/quantity';

export const OPERATION_TYPES = ['BUY', 'SELL'] as const;
export type OperationType = (typeof OPERATION_TYPES)[number];

export const CORPORATE_EVENT_TYPES = [
  'SPLIT',
  'REVERSE_SPLIT',
  'BONUS',
] as const;
export type CorporateEventType = (typeof CORPORATE_EVENT_TYPES)[number];

declare const validated: unique symbol;

/** Brand set only by the factories below: the calculator only ever receives validated items. */
interface Validated {
  readonly [validated]: true;
}

interface OperationBase extends Validated {
  readonly kind: 'operation';
  readonly id: string;
  readonly date: LocalDate;
  /** Order among operations of the same date (operations.sequence, RN09). */
  readonly sequence: bigint;
  readonly quantity: Quantity;
  readonly unitPrice: Money;
  readonly fees: Money;
  /** The broker does not affect the position (RN12); it is kept for the trace. */
  readonly brokerId: string;
}

export interface BuyOperation extends OperationBase {
  readonly type: 'BUY';
}

export interface SellOperation extends OperationBase {
  readonly type: 'SELL';
}

/** A buy or sell of one asset (RN04). */
export type TimelineOperation = BuyOperation | SellOperation;

interface CorporateEventBase extends Validated {
  readonly kind: 'corporate-event';
  readonly id: string;
  /** Ex-date: the event applies before the operations of that date. */
  readonly date: LocalDate;
  readonly ratioFrom: Decimal;
  readonly ratioTo: Decimal;
}

export interface SplitEvent extends CorporateEventBase {
  readonly type: 'SPLIT' | 'REVERSE_SPLIT';
  readonly bonusUnitCost: null;
}

export interface BonusEvent extends CorporateEventBase {
  readonly type: 'BONUS';
  /** Cost attributed to each bonus unit (zero is allowed). */
  readonly bonusUnitCost: Money;
}

/**
 * Split, reverse split or bonus of the asset (D29, from S2 on). Ratio "from → to": whoever holds `ratioFrom` units
 * holds `ratioTo` units from the ex-date on (e.g. split 1 → 2, reverse split 10 → 1, 10% bonus 10 → 11).
 */
export type TimelineCorporateEvent = SplitEvent | BonusEvent;

export type TimelineItem = TimelineOperation | TimelineCorporateEvent;

function oneOf<T extends string>(
  allowed: readonly T[],
  value: string,
  field: string,
): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new InvalidValueError(field, `must be one of ${allowed.join(', ')}`);
  }
  return value as T;
}

export interface OperationProps {
  id: string;
  type: OperationType;
  date: string;
  sequence: bigint;
  quantity: DecimalInput;
  unitPrice: DecimalInput;
  fees: DecimalInput;
  brokerId: string;
}

/**
 * Builds a valid operation: known type, quantity > 0, unit price > 0, fees >= 0 (RN04). Whether the quantity fits
 * the asset class (whole units, 0.01, 8 places) is checked by assertQuantityAllowed.
 */
export function timelineOperation(props: OperationProps): TimelineOperation {
  const type = oneOf(OPERATION_TYPES, props.type, 'type');
  const quantity = Quantity.of(props.quantity, 'quantity');
  if (quantity.isZero()) {
    throw new InvalidValueError('quantity', 'must be greater than zero');
  }
  const unitPrice = Money.of(props.unitPrice, 'unitPrice');
  if (!unitPrice.isPositive()) {
    throw new InvalidValueError('unitPrice', 'must be greater than zero');
  }
  const fees = Money.of(props.fees, 'fees');
  if (fees.isNegative()) {
    throw new InvalidValueError('fees', 'must not be negative');
  }
  return {
    kind: 'operation',
    id: props.id,
    type,
    date: LocalDate.parse(props.date, 'date'),
    sequence: props.sequence,
    quantity,
    unitPrice,
    fees,
    brokerId: props.brokerId,
  } as TimelineOperation;
}

export interface CorporateEventProps {
  id: string;
  type: CorporateEventType;
  exDate: string;
  ratioFrom: DecimalInput;
  ratioTo: DecimalInput;
  bonusUnitCost?: DecimalInput | null;
}

const RATIO_DIRECTION: Record<CorporateEventType, string> = {
  SPLIT: 'must be greater than ratioFrom in a split',
  REVERSE_SPLIT: 'must be smaller than ratioFrom in a reverse split',
  BONUS: 'must be greater than ratioFrom in a bonus',
};

function positiveRatio(value: DecimalInput, field: string): Decimal {
  const ratio = toDecimal(value, field);
  if (ratio.lessThanOrEqualTo(0)) {
    throw new InvalidValueError(field, 'must be greater than zero');
  }
  return ratio;
}

/**
 * Builds a valid corporate event: known type; ratios > 0; a split increases and a reverse split decreases the number
 * of units; a bonus increases it and carries a unit cost >= 0, which only a bonus may have.
 */
export function corporateEvent(
  props: CorporateEventProps,
): TimelineCorporateEvent {
  const type = oneOf(CORPORATE_EVENT_TYPES, props.type, 'type');
  const ratioFrom = positiveRatio(props.ratioFrom, 'ratioFrom');
  const ratioTo = positiveRatio(props.ratioTo, 'ratioTo');
  const directionOk =
    type === 'REVERSE_SPLIT'
      ? ratioTo.lessThan(ratioFrom)
      : ratioTo.greaterThan(ratioFrom);
  if (!directionOk) {
    throw new InvalidValueError('ratioTo', RATIO_DIRECTION[type]);
  }

  const base = {
    kind: 'corporate-event' as const,
    id: props.id,
    date: LocalDate.parse(props.exDate, 'exDate'),
    ratioFrom,
    ratioTo,
  };
  const hasBonusCost =
    props.bonusUnitCost !== undefined && props.bonusUnitCost !== null;

  if (type !== 'BONUS') {
    if (hasBonusCost) {
      throw new InvalidValueError(
        'bonusUnitCost',
        'is only allowed in a bonus',
      );
    }
    return { ...base, type, bonusUnitCost: null } as SplitEvent;
  }
  if (!hasBonusCost) {
    throw new InvalidValueError('bonusUnitCost', 'is required in a bonus');
  }
  const bonusUnitCost = Money.of(
    props.bonusUnitCost as DecimalInput,
    'bonusUnitCost',
  );
  if (bonusUnitCost.isNegative()) {
    throw new InvalidValueError('bonusUnitCost', 'must not be negative');
  }
  return { ...base, type, bonusUnitCost } as BonusEvent;
}

/**
 * Chronological order of the timeline (RN09): by date; on the same date corporate events come first (they apply on
 * the ex-date, before that day's trades); operations by sequence. Two events of the same date are ordered by id only
 * for determinism: the business order of, e.g., a split and a bonus on one ex-date is an open S2 decision.
 */
export function compareTimelineItems(a: TimelineItem, b: TimelineItem): number {
  const byDate = a.date.compareTo(b.date);
  if (byDate !== 0) {
    return byDate;
  }
  if (a.kind !== b.kind) {
    return a.kind === 'corporate-event' ? -1 : 1;
  }
  // Same kind from here on: operations by sequence, events by id.
  return compareKeys(tieBreaker(a), tieBreaker(b));
}

function tieBreaker(item: TimelineItem): bigint | string {
  return item.kind === 'operation' ? item.sequence : item.id;
}

function compareKeys(a: bigint | string, b: bigint | string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
