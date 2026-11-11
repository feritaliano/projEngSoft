import { Prisma } from '../../../generated/prisma/client';
import { InvalidValueError } from '../../../shared/domain/domain-error';
import { InconsistentTimelineError } from '../domain/inconsistent-timeline';
import type { OperationDraft, StoredOperation } from '../domain/operation';
import { timelineOperation } from '../domain/timeline';

export const OPERATION_FIELDS = {
  id: true,
  portfolioId: true,
  assetId: true,
  brokerId: true,
  type: true,
  tradeDate: true,
  sequence: true,
  quantity: true,
  unitPrice: true,
  fees: true,
} as const;

export type OperationRow = Prisma.OperationGetPayload<{
  select: typeof OPERATION_FIELDS;
}>;

/** A stored row that breaks RN04 is a data fault, not the client's: it must not become a 400 with its field. */
export function toStoredOperation(row: OperationRow): StoredOperation {
  try {
    return {
      assetId: row.assetId,
      operation: timelineOperation({
        id: row.id,
        type: row.type,
        // trade_date is a DATE: Prisma returns it at UTC midnight.
        date: row.tradeDate.toISOString().slice(0, 10),
        sequence: row.sequence,
        // toFixed, not toString: Decimal switches to exponent notation below 1e-7 (e.g. 8-place crypto quantities),
        // which the domain only accepts as plain decimals.
        quantity: row.quantity.toFixed(),
        unitPrice: row.unitPrice.toFixed(),
        fees: row.fees.toFixed(),
        brokerId: row.brokerId,
      }),
    };
  } catch (error) {
    if (error instanceof InvalidValueError) {
      throw new InconsistentTimelineError(
        row.portfolioId,
        row.assetId,
        `has an invalid operation ${row.id}: ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }
}

/** Columns of a draft; decimals as plain strings, so the database stores exactly the validated value (RN11). */
export function columnsOf(draft: OperationDraft) {
  return {
    assetId: draft.assetId,
    brokerId: draft.brokerId,
    type: draft.type,
    tradeDate: new Date(`${draft.tradeDate.toString()}T00:00:00Z`),
    quantity: draft.quantity.toString(),
    unitPrice: draft.unitPrice.toString(),
    fees: draft.fees.toString(),
  };
}
