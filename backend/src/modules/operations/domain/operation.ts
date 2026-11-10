import { Decimal } from '../../../shared/domain/decimal';
import {
  DomainError,
  InvalidValueError,
} from '../../../shared/domain/domain-error';
import { LocalDate } from '../../../shared/domain/local-date';
import { Money } from '../../../shared/domain/money';
import { Quantity } from '../../../shared/domain/quantity';
import { isUuid } from '../../../shared/domain/uuid';
import { AssetType } from './asset-type';
import { assertQuantityAllowed } from './quantity-rules';
import {
  OperationType,
  TimelineOperation,
  timelineOperation,
} from './timeline';

/** An operation id known to be a uuid (see parseOperationId). */
export type OperationId = string & { readonly __brand: 'OperationId' };

/** Null when the value cannot name an operation: callers answer it as OperationNotFoundError (404). */
export function parseOperationId(value: string): OperationId | null {
  return isUuid(value) ? (value as OperationId) : null;
}

/** RN02: a missing operation, one of another portfolio and a malformed id get the same answer (404). */
export class OperationNotFoundError extends DomainError {
  readonly code = 'OPERATION_NOT_FOUND';

  constructor() {
    super('Operation not found');
  }
}

/** An operation as stored: its timeline item (RN09) and the asset whose timeline it belongs to (RN12). */
export interface StoredOperation {
  readonly assetId: string;
  readonly operation: TimelineOperation;
}

/** The fields of an operation as the client sends them (decimals and the date as strings, RN11). */
export interface OperationInput {
  readonly assetId: string;
  readonly brokerId: string;
  readonly type: string;
  readonly tradeDate: string;
  readonly quantity: string;
  readonly unitPrice: string;
  readonly fees: string;
}

/** The validated content of an operation, before it has an id and a sequence. */
export interface OperationDraft {
  readonly assetId: string;
  readonly brokerId: string;
  readonly type: OperationType;
  readonly tradeDate: LocalDate;
  readonly quantity: Quantity;
  readonly unitPrice: Money;
  readonly fees: Money;
}

interface ColumnLimit {
  readonly integerDigits: number;
  readonly decimalPlaces: number;
}

/**
 * Precision of the columns: quantity and unit_price NUMERIC(20,8), fees NUMERIC(18,2). PostgreSQL rounds extra decimal
 * places silently (a different value than the one sent) and rejects extra integer digits with an error (a 500), so
 * both are rejected here with the field (RN11: the stored value is the value sent).
 */
export const COLUMN_LIMITS = {
  quantity: { integerDigits: 12, decimalPlaces: 8 },
  unitPrice: { integerDigits: 12, decimalPlaces: 8 },
  fees: { integerDigits: 16, decimalPlaces: 2 },
} as const satisfies Record<string, ColumnLimit>;

function assertFits(value: Decimal, field: keyof typeof COLUMN_LIMITS): void {
  const limit = COLUMN_LIMITS[field];
  if (value.decimalPlaces() > limit.decimalPlaces) {
    throw new InvalidValueError(
      field,
      'TOO_MANY_DECIMALS',
      `must have at most ${limit.decimalPlaces} decimal places`,
      { maxDecimals: limit.decimalPlaces },
    );
  }
  if (
    value.abs().greaterThanOrEqualTo(new Decimal(10).pow(limit.integerDigits))
  ) {
    throw new InvalidValueError(
      field,
      'TOO_LARGE',
      `must have at most ${limit.integerDigits} digits before the decimal point`,
      { maxIntegerDigits: limit.integerDigits },
    );
  }
}

/**
 * RN04: a valid operation for an asset of the given class: known type; trade date not after today (D54: today in
 * São Paulo); quantity > 0 and allowed for the class (whole units, 0.01, 8 places); unit price > 0; fees >= 0; every
 * value within its column. Throws InvalidValueError (InvalidQuantityError for the class rule) with the field and the
 * code of the broken rule (D56).
 */
export function operationDraft(
  input: OperationInput,
  context: { readonly assetType: AssetType; readonly today: LocalDate },
): OperationDraft {
  const tradeDate = LocalDate.parse(input.tradeDate, 'tradeDate');
  if (tradeDate.isAfter(context.today)) {
    throw new InvalidValueError(
      'tradeDate',
      'FUTURE_DATE',
      `must not be after today (${context.today.toString()})`,
      { today: context.today.toString() },
    );
  }
  // Type, quantity > 0, price > 0 and fees >= 0 are the rules of every timeline item (K0).
  const item = timelineOperation({
    id: '',
    sequence: 0n,
    type: input.type as OperationType,
    date: tradeDate.toString(),
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    fees: input.fees,
    brokerId: input.brokerId,
  });
  assertQuantityAllowed(context.assetType, item.quantity);
  assertFits(item.quantity.value, 'quantity');
  assertFits(item.unitPrice.value, 'unitPrice');
  assertFits(item.fees.value, 'fees');
  return {
    assetId: input.assetId,
    brokerId: input.brokerId,
    type: item.type,
    tradeDate,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    fees: item.fees,
  };
}

/** The draft as a timeline item with the given identity (a stored operation, or the unsaved one of a command). */
export function draftAsTimelineItem(
  draft: OperationDraft,
  id: string,
  sequence: bigint,
): TimelineOperation {
  return timelineOperation({
    id,
    sequence,
    type: draft.type,
    date: draft.tradeDate.toString(),
    quantity: draft.quantity.value,
    unitPrice: draft.unitPrice.value,
    fees: draft.fees.value,
    brokerId: draft.brokerId,
  });
}

/** The stored operation as the input of an edit: a PATCH changes only the fields it sends (merge). */
export function inputOf(stored: StoredOperation): OperationInput {
  const { operation } = stored;
  return {
    assetId: stored.assetId,
    brokerId: operation.brokerId,
    type: operation.type,
    tradeDate: operation.date.toString(),
    quantity: operation.quantity.toString(),
    unitPrice: operation.unitPrice.toString(),
    fees: operation.fees.toString(),
  };
}
