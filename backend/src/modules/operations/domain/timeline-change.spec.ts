import { buy, sell } from '../../../../test/factories/timeline.factory';
import { LocalDate } from '../../../shared/domain/local-date';
import { operationDraft, StoredOperation } from './operation';
import { InconsistentTimelineError } from './inconsistent-timeline';
import { NegativePositionError } from './position-calculator';
import { TimelineItem } from './timeline';
import {
  ChangeEvaluation,
  createPlan,
  editPlan,
  evaluateChange,
  RuleViolationError,
  UNSAVED_OPERATION_ID,
  UNSAVED_SEQUENCE,
} from './timeline-change';

function timeline(...items: TimelineItem[]) {
  return { portfolioId: 'p1', assetId: 'a-petr4', items };
}

function unsaved(item: ReturnType<typeof buy>) {
  return { ...item, id: UNSAVED_OPERATION_ID, sequence: UNSAVED_SEQUENCE };
}

function violationOf(evaluation: ChangeEvaluation): RuleViolationError {
  if (evaluation.ok) {
    throw new Error('expected a violation');
  }
  return evaluation.violation;
}

function positionOf(evaluation: ChangeEvaluation) {
  if (!evaluation.ok) {
    throw new Error(`unexpected violation: ${evaluation.violation.message}`);
  }
  return evaluation.position;
}

describe('evaluateChange (RN07, RN09, RN10)', () => {
  const b1 = buy('2026-01-05', '100', '29.95', '5.00', {
    id: 'b1',
    sequence: 1n,
  });
  const s1 = sell('2026-06-02', '50', '38.00', '4.90', {
    id: 's1',
    sequence: 3n,
  });

  it('adds an operation and recalculates the position', () => {
    const evaluation = evaluateChange(timeline(b1), {
      kind: 'add',
      operation: unsaved(sell('2026-06-02', '100', '38.00', '4.90')),
    });

    const position = positionOf(evaluation);
    expect(position.quantity.isZero()).toBe(true); // venda total
    expect(position.realizedProfit.toFixed(2)).toBe('795.10');
    expect(evaluation.steps).toHaveLength(2);
  });

  it('rejects a sell above the position as RN07, without an id because nothing was saved', () => {
    const violation = violationOf(
      evaluateChange(timeline(b1), {
        kind: 'add',
        operation: unsaved(sell('2026-10-28', '150', '38.50')),
      }),
    );

    expect(violation).toBeInstanceOf(RuleViolationError);
    expect(violation.rule).toBe('RN07');
    expect(violation.operationId).toBeNull();
    expect(violation.assetId).toBe('a-petr4');
    expect(violation.availableQuantity.toString()).toBe('100');
    expect(violation.soldQuantity.toString()).toBe('150');
    expect(violation.cause).toBeInstanceOf(NegativePositionError);
  });

  it('rejects a retroactive sell that makes a later sell exceed the position as RN10, naming the later sell', () => {
    const violation = violationOf(
      evaluateChange(timeline(b1, s1), {
        kind: 'add',
        operation: unsaved(sell('2026-03-01', '60', '33.00')),
      }),
    );

    expect(violation.rule).toBe('RN10');
    expect(violation.operationId).toBe('s1');
    expect(violation.availableQuantity.toString()).toBe('40');
    expect(violation.soldQuantity.toString()).toBe('50');
  });

  it('places the unsaved operation after the stored ones of its date', () => {
    // A sell of the same date as the buy, entered later, comes after it (RN09).
    const evaluation = evaluateChange(timeline(b1), {
      kind: 'add',
      operation: unsaved(sell('2026-01-05', '100', '30.00')),
    });

    expect(positionOf(evaluation).quantity.isZero()).toBe(true);
  });

  it('replaces an operation: editing a buy so that a later sell exceeds the position is RN10 (frame 6)', () => {
    const edited = buy('2026-01-05', '40', '29.95', '5.00', {
      id: 'b1',
      sequence: 1n,
    });

    const violation = violationOf(
      evaluateChange(timeline(b1, s1), { kind: 'replace', operation: edited }),
    );

    expect(violation.rule).toBe('RN10');
    expect(violation.operationId).toBe('s1');
    expect(violation.availableQuantity.toString()).toBe('40');
  });

  it('replaces an operation: raising the edited sell above the position is RN07, with its id', () => {
    const edited = sell('2026-06-02', '120', '38.00', '4.90', {
      id: 's1',
      sequence: 3n,
    });

    const violation = violationOf(
      evaluateChange(timeline(b1, s1), { kind: 'replace', operation: edited }),
    );

    expect(violation.rule).toBe('RN07');
    expect(violation.operationId).toBe('s1');
  });

  it('replaces an operation keeping the rest of the timeline', () => {
    const edited = buy('2026-01-05', '200', '29.95', '5.00', {
      id: 'b1',
      sequence: 1n,
    });

    const position = positionOf(
      evaluateChange(timeline(b1, s1), { kind: 'replace', operation: edited }),
    );

    expect(position.quantity.toString()).toBe('150');
  });

  it('removes a buy that leaves a later sell without units as RN10 (exclusão de compra)', () => {
    const violation = violationOf(
      evaluateChange(timeline(b1, s1), { kind: 'remove', operationId: 'b1' }),
    );

    expect(violation.rule).toBe('RN10');
    expect(violation.operationId).toBe('s1');
    expect(violation.availableQuantity.toString()).toBe('0');
  });

  it('removes a sell and recalculates', () => {
    const position = positionOf(
      evaluateChange(timeline(b1, s1), { kind: 'remove', operationId: 's1' }),
    );

    expect(position.quantity.toString()).toBe('100');
    expect(position.realizedProfit.isZero()).toBe(true);
  });

  it('restarts the average price on a buy after the position was closed (RN08, recompra após zerar)', () => {
    const closing = sell('2026-02-10', '100', '35.00', '0', {
      id: 's0',
      sequence: 2n,
    });

    const position = positionOf(
      evaluateChange(timeline(b1, closing), {
        kind: 'add',
        operation: unsaved(buy('2026-03-01', '10', '40.00', '2.00')),
      }),
    );

    expect(position.averagePrice.toFixed(2)).toBe('40.20');
  });

  it('sums the brokers of the portfolio in one position (RN12)', () => {
    const other = buy('2026-01-06', '50', '30.00', '0', {
      id: 'b2',
      sequence: 2n,
      brokerId: 'broker-rico',
    });

    const position = positionOf(
      evaluateChange(timeline(b1, other), {
        kind: 'add',
        operation: unsaved(sell('2026-02-01', '150', '31.00')),
      }),
    );

    expect(position.quantity.isZero()).toBe(true);
  });

  it('keeps every decimal place of the prices and 8-place crypto quantities (RN11, D44)', () => {
    const btc = buy('2026-01-05', '0.0125', '328000.12345678', '0', {
      id: 'btc',
      sequence: 1n,
    });

    const position = positionOf(
      evaluateChange(timeline(btc), {
        kind: 'add',
        operation: unsaved(sell('2026-02-01', '0.00000001', '330000.00000001')),
      }),
    );

    expect(position.quantity.toString()).toBe('0.01249999');
    expect(position.averagePrice.toString()).toBe('328000.12345678');
  });

  it('refuses a stored timeline that is already negative as a server fault, not as the client violation', () => {
    const broken = timeline(s1);

    expect(() =>
      evaluateChange(broken, {
        kind: 'add',
        operation: unsaved(buy('2026-07-01', '10', '30.00')),
      }),
    ).toThrow(InconsistentTimelineError);
  });

  it.each([
    [
      'replace',
      {
        kind: 'replace' as const,
        operation: buy('2026-01-05', '1', '1', '0', { id: 'gone' }),
      },
    ],
    ['remove', { kind: 'remove' as const, operationId: 'gone' }],
  ])(
    'throws when the operation to %s is not in the timeline (programming error)',
    (_kind, change) => {
      expect(() => evaluateChange(timeline(b1), change)).toThrow(
        'Operation gone is not in the timeline',
      );
    },
  );
});

describe('createPlan and editPlan (B2, B4, D42)', () => {
  const draft = (assetId: string) =>
    operationDraft(
      {
        assetId,
        brokerId: 'broker-xp',
        type: 'BUY',
        tradeDate: '2026-02-01',
        quantity: '10',
        unitPrice: '20',
        fees: '0',
      },
      { assetType: 'STOCK', today: LocalDate.parse('2026-11-11') },
    );
  const stored: StoredOperation = {
    assetId: 'a-petr4',
    operation: buy('2026-01-05', '100', '29.95', '5.00', {
      id: 'b1',
      sequence: 7n,
    }),
  };

  it('adds a new operation, unsaved and last of its date, to its timeline', () => {
    const plan = createPlan(draft('a-petr4'));

    expect(plan.operation).toMatchObject({
      id: UNSAVED_OPERATION_ID,
      sequence: UNSAVED_SEQUENCE,
      type: 'BUY',
    });
    expect(plan.changes).toEqual([
      {
        assetId: 'a-petr4',
        change: { kind: 'add', operation: plan.operation },
      },
    ]);
  });

  it('replaces an edited operation in its timeline, keeping its id and sequence', () => {
    const plan = editPlan(stored, draft('a-petr4'));

    expect(plan.operation).toMatchObject({ id: 'b1', sequence: 7n });
    expect(plan.operation.quantity.toString()).toBe('10');
    expect(plan.changes).toEqual([
      {
        assetId: 'a-petr4',
        change: { kind: 'replace', operation: plan.operation },
      },
    ]);
  });

  it('moves an edited operation to another asset: out of the old timeline first, then into the new one (RN10)', () => {
    const plan = editPlan(stored, draft('a-itsa4'));

    expect(plan.changes).toEqual([
      { assetId: 'a-petr4', change: { kind: 'remove', operationId: 'b1' } },
      {
        assetId: 'a-itsa4',
        change: { kind: 'add', operation: plan.operation },
      },
    ]);
  });
});
