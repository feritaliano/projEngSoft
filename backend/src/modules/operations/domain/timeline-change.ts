import { DomainError } from '../../../shared/domain/domain-error';
import { Quantity } from '../../../shared/domain/quantity';
import { InconsistentTimelineError } from './inconsistent-timeline';
import {
  draftAsTimelineItem,
  OperationDraft,
  StoredOperation,
} from './operation';
import {
  calculatePosition,
  NegativePositionError,
  Position,
  PositionStep,
} from './position-calculator';
import { SellOperation, TimelineItem, TimelineOperation } from './timeline';
import { PortfolioAssetTimeline } from './timeline-reader';

/**
 * Identity of an operation that is not stored yet (a create, or its preview). The database gives it a sequence greater
 * than every stored one, and the (portfolio, asset) lock keeps it so until the commit: it is the last of its date.
 */
export const UNSAVED_OPERATION_ID = 'unsaved';
export const UNSAVED_SEQUENCE = 9_223_372_036_854_775_807n;

/** The id the API shows for an operation: null while it is not saved (a create, or its preview). */
export function savedIdOf(operation: TimelineOperation): string | null {
  return operation.id === UNSAVED_OPERATION_ID ? null : operation.id;
}

/** What a command does to one timeline: add an operation, replace one (same id) or remove one. */
export type TimelineChange =
  | { readonly kind: 'add'; readonly operation: TimelineOperation }
  | { readonly kind: 'replace'; readonly operation: TimelineOperation }
  | { readonly kind: 'remove'; readonly operationId: string };

/** A change and the (portfolio, asset) timeline it applies to. */
export interface PlannedChange {
  readonly assetId: string;
  readonly change: TimelineChange;
}

/**
 * What a create or an edit does to the timelines, shared by the command and its preview (D42) so both check the same
 * changes: `operation` as it would be saved, and the changes in the order they are checked (the last one holds it).
 */
export interface ChangePlan {
  readonly operation: TimelineOperation;
  readonly changes: readonly PlannedChange[];
}

/** B2: a new operation is added to its timeline as the last of its date. */
export function createPlan(draft: OperationDraft): ChangePlan {
  const operation = draftAsTimelineItem(
    draft,
    UNSAVED_OPERATION_ID,
    UNSAVED_SEQUENCE,
  );
  return {
    operation,
    changes: [{ assetId: draft.assetId, change: { kind: 'add', operation } }],
  };
}

/**
 * B4: the edit keeps the id and the sequence. It replaces the operation in its timeline or, when it moves it to
 * another asset, removes it from the old timeline (checked first, RN10) and adds it to the new one.
 */
export function editPlan(
  stored: StoredOperation,
  draft: OperationDraft,
): ChangePlan {
  const operation = draftAsTimelineItem(
    draft,
    stored.operation.id,
    stored.operation.sequence,
  );
  const changes: PlannedChange[] =
    draft.assetId === stored.assetId
      ? [{ assetId: draft.assetId, change: { kind: 'replace', operation } }]
      : [
          {
            assetId: stored.assetId,
            change: { kind: 'remove', operationId: operation.id },
          },
          { assetId: draft.assetId, change: { kind: 'add', operation } },
        ];
  return { operation, changes };
}

/**
 * RN07: the operation being saved is itself a sell above the position at its date. RN10: the change makes another
 * (later) sell go above the position at its date. The frontend picks the BusinessRuleError variant by it (C2).
 */
export type BusinessRule = 'RN07' | 'RN10';

/**
 * A change rejected because a sell would exceed the units held at its point of the timeline (RN07, RN10). The whole
 * change is rejected (nothing is written); `operation` is the offending sell, the first one in chronological order.
 */
export class RuleViolationError extends DomainError {
  readonly code = 'RULE_VIOLATION';

  constructor(
    readonly rule: BusinessRule,
    readonly assetId: string,
    readonly operation: SellOperation,
    readonly availableQuantity: Quantity,
    cause: NegativePositionError,
  ) {
    super(
      `${rule}: sell ${operation.id} of ${operation.quantity.toString()} on ${operation.date.toString()} exceeds ` +
        `the ${availableQuantity.toString()} units held at that point`,
      { cause },
    );
  }

  get soldQuantity(): Quantity {
    return this.operation.quantity;
  }

  /** Null when the offending sell is the operation being created, which has no id (nothing was saved). */
  get operationId(): string | null {
    return savedIdOf(this.operation);
  }
}

export type ChangeEvaluation =
  | {
      readonly ok: true;
      readonly position: Position;
      readonly steps: readonly PositionStep[];
    }
  | {
      readonly ok: false;
      readonly violation: RuleViolationError;
      /** Steps applied before the offending sell. */
      readonly steps: readonly PositionStep[];
    };

function applyChange(
  items: readonly TimelineItem[],
  change: TimelineChange,
): TimelineItem[] {
  switch (change.kind) {
    case 'add':
      return [...items, change.operation];
    case 'replace':
    case 'remove': {
      const id =
        change.kind === 'replace' ? change.operation.id : change.operationId;
      const index = items.findIndex(
        (item) => item.kind === 'operation' && item.id === id,
      );
      if (index < 0) {
        // The caller loaded and locked the operation in this timeline: not finding it is a programming error.
        throw new Error(`Operation ${id} is not in the timeline`);
      }
      const rest = items.filter((_, i) => i !== index);
      return change.kind === 'replace' ? [...rest, change.operation] : rest;
    }
  }
}

/**
 * RN09/RN10: recalculates the whole timeline of one (portfolio, asset) with the change, in chronological order. The
 * stored timeline must be valid before the change; if it is not, the data was written outside the API
 * (InconsistentTimelineError, a 500), which must not be reported as the client's violation.
 * Pure: the same function backs the commands (which then write) and the preview (D42), so both give the same numbers
 * and the same violation.
 */
export function evaluateChange(
  timeline: PortfolioAssetTimeline,
  change: TimelineChange,
): ChangeEvaluation {
  const current = calculatePosition(timeline.items);
  if (!current.ok) {
    throw new InconsistentTimelineError(
      timeline.portfolioId,
      timeline.assetId,
      'goes negative',
      { cause: current.error },
    );
  }

  const result = calculatePosition(applyChange(timeline.items, change));
  if (result.ok) {
    return { ok: true, position: result.position, steps: result.steps };
  }
  const offending = result.error.operation;
  const changedId = change.kind === 'remove' ? null : change.operation.id;
  return {
    ok: false,
    violation: new RuleViolationError(
      offending.id === changedId ? 'RN07' : 'RN10',
      timeline.assetId,
      offending,
      result.error.availableQuantity,
      result.error,
    ),
    steps: result.steps,
  };
}
