import {
  corporateEvent,
  OperationProps,
  TimelineCorporateEvent,
  TimelineOperation,
  timelineOperation,
} from '../../src/modules/operations/domain/timeline';

let nextSequence = 1n;

type OperationOverrides = Partial<
  Pick<OperationProps, 'id' | 'sequence' | 'brokerId'>
>;

function operation(
  type: OperationProps['type'],
  date: string,
  quantity: string,
  unitPrice: string,
  fees: string,
  overrides: OperationOverrides,
): TimelineOperation {
  const sequence = overrides.sequence ?? nextSequence++;
  return timelineOperation({
    id: overrides.id ?? `${type.toLowerCase()}-${sequence.toString()}`,
    type,
    date,
    sequence,
    quantity,
    unitPrice,
    fees,
    brokerId: overrides.brokerId ?? 'broker-xp',
  });
}

/** Buy builder for domain tests; sequence grows in call order unless given. */
export function buy(
  date: string,
  quantity: string,
  unitPrice: string,
  fees = '0',
  overrides: OperationOverrides = {},
): TimelineOperation {
  return operation('BUY', date, quantity, unitPrice, fees, overrides);
}

export function sell(
  date: string,
  quantity: string,
  unitPrice: string,
  fees = '0',
  overrides: OperationOverrides = {},
): TimelineOperation {
  return operation('SELL', date, quantity, unitPrice, fees, overrides);
}

export function split(
  exDate: string,
  ratioFrom: string,
  ratioTo: string,
): TimelineCorporateEvent {
  return corporateEvent({
    id: `split-${exDate}`,
    type: 'SPLIT',
    exDate,
    ratioFrom,
    ratioTo,
  });
}

export function reverseSplit(
  exDate: string,
  ratioFrom: string,
  ratioTo: string,
): TimelineCorporateEvent {
  return corporateEvent({
    id: `reverse-split-${exDate}`,
    type: 'REVERSE_SPLIT',
    exDate,
    ratioFrom,
    ratioTo,
  });
}

export function bonus(
  exDate: string,
  ratioFrom: string,
  ratioTo: string,
  bonusUnitCost: string,
): TimelineCorporateEvent {
  return corporateEvent({
    id: `bonus-${exDate}`,
    type: 'BONUS',
    exDate,
    ratioFrom,
    ratioTo,
    bonusUnitCost,
  });
}
