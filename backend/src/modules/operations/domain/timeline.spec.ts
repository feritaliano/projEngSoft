import { InvalidValueError } from '../../../shared/domain/domain-error';
import { Quantity } from '../../../shared/domain/quantity';
import { ASSET_TYPES, AssetType, isAssetType } from './asset-type';
import { assertQuantityAllowed, InvalidQuantityError } from './quantity-rules';
import {
  compareTimelineItems,
  corporateEvent,
  CorporateEventProps,
  OperationProps,
  timelineOperation,
} from './timeline';

const validOperation: OperationProps = {
  id: 'op-1',
  type: 'BUY',
  date: '2026-01-05',
  sequence: 1n,
  quantity: '100',
  unitPrice: '29.95',
  fees: '5.00',
  brokerId: 'broker-xp',
};

describe('timelineOperation (RN04)', () => {
  it('builds an operation with Decimal values', () => {
    const operation = timelineOperation(validOperation);

    expect(operation).toMatchObject({
      kind: 'operation',
      id: 'op-1',
      type: 'BUY',
      sequence: 1n,
    });
    expect(operation.date.toString()).toBe('2026-01-05');
    expect(operation.quantity.toString()).toBe('100');
    expect(operation.unitPrice.toString()).toBe('29.95');
    expect(operation.fees.toString()).toBe('5');
  });

  it.each(['sell', 'TRANSFER', ''])(
    'rejects the unknown operation type %j, which must never count as a sell',
    (type) => {
      expect(() =>
        timelineOperation({
          ...validOperation,
          type: type as OperationProps['type'],
        }),
      ).toThrow(new InvalidValueError('type', 'must be one of BUY, SELL'));
    },
  );

  it('accepts zero fees', () => {
    expect(
      timelineOperation({ ...validOperation, fees: '0' }).fees.isZero(),
    ).toBe(true);
  });

  it.each([
    ['quantity zero', { quantity: '0' }, 'quantity must be greater than zero'],
    ['negative quantity', { quantity: '-1' }, 'quantity must not be negative'],
    [
      'unit price zero',
      { unitPrice: '0' },
      'unitPrice must be greater than zero',
    ],
    [
      'negative unit price',
      { unitPrice: '-1' },
      'unitPrice must be greater than zero',
    ],
    ['negative fees', { fees: '-0.01' }, 'fees must not be negative'],
    [
      'invalid date',
      { date: '2026-02-30' },
      'date must be a valid calendar date',
    ],
  ])('rejects %s', (_case, override, message) => {
    expect(() => timelineOperation({ ...validOperation, ...override })).toThrow(
      expect.objectContaining({ message }) as Error,
    );
  });
});

describe('corporateEvent (D29)', () => {
  const split: CorporateEventProps = {
    id: 'ev-1',
    type: 'SPLIT',
    exDate: '2026-02-01',
    ratioFrom: '1',
    ratioTo: '2',
  };

  it('builds split, reverse split and bonus', () => {
    expect(corporateEvent(split)).toMatchObject({
      kind: 'corporate-event',
      type: 'SPLIT',
      bonusUnitCost: null,
    });
    expect(
      corporateEvent({
        ...split,
        type: 'REVERSE_SPLIT',
        ratioFrom: '10',
        ratioTo: '1',
      }).ratioTo.toFixed(),
    ).toBe('1');
    const bonus = corporateEvent({
      ...split,
      type: 'BONUS',
      ratioFrom: '10',
      ratioTo: '11',
      bonusUnitCost: '5.00',
    });
    expect(bonus.bonusUnitCost?.toString()).toBe('5');
    expect(bonus.date.toString()).toBe('2026-02-01');
  });

  it('accepts a bonus with zero unit cost', () => {
    expect(
      corporateEvent({
        ...split,
        type: 'BONUS',
        ratioTo: '1.1',
        bonusUnitCost: '0',
      }).bonusUnitCost?.isZero(),
    ).toBe(true);
  });

  it.each<[string, Partial<CorporateEventProps>, string]>([
    [
      'ratioFrom zero',
      { ratioFrom: '0' },
      'ratioFrom must be greater than zero',
    ],
    [
      'negative ratioTo',
      { ratioTo: '-2' },
      'ratioTo must be greater than zero',
    ],
    [
      'split that does not increase',
      { ratioTo: '1' },
      'ratioTo must be greater than ratioFrom in a split',
    ],
    [
      'reverse split that does not decrease',
      { type: 'REVERSE_SPLIT', ratioFrom: '1', ratioTo: '1' },
      'ratioTo must be smaller than ratioFrom in a reverse split',
    ],
    [
      'bonus that does not increase',
      { type: 'BONUS', ratioFrom: '11', ratioTo: '10', bonusUnitCost: '1' },
      'ratioTo must be greater than ratioFrom in a bonus',
    ],
    [
      'bonus without unit cost',
      { type: 'BONUS', ratioTo: '2' },
      'bonusUnitCost is required in a bonus',
    ],
    [
      'bonus with null unit cost',
      { type: 'BONUS', ratioTo: '2', bonusUnitCost: null },
      'bonusUnitCost is required in a bonus',
    ],
    [
      'bonus with negative unit cost',
      { type: 'BONUS', ratioTo: '2', bonusUnitCost: '-1' },
      'bonusUnitCost must not be negative',
    ],
    [
      'split with unit cost',
      { bonusUnitCost: '1' },
      'bonusUnitCost is only allowed in a bonus',
    ],
    [
      'invalid ex-date',
      { exDate: '01/02/2026' },
      'exDate must be a date in YYYY-MM-DD format',
    ],
  ])('rejects %s', (_case, override, message) => {
    expect(() => corporateEvent({ ...split, ...override })).toThrow(
      expect.objectContaining({ message }) as Error,
    );
  });

  it('throws InvalidValueError naming the field', () => {
    expect(() => corporateEvent({ ...split, ratioFrom: 'x' })).toThrow(
      expect.objectContaining({
        name: 'InvalidValueError',
        code: 'INVALID_VALUE',
        field: 'ratioFrom',
      }) as Error,
    );
  });

  it('rejects an unknown event type coming from loosely typed input', () => {
    expect(() =>
      corporateEvent({
        ...split,
        type: 'AMORTIZATION' as CorporateEventProps['type'],
      }),
    ).toThrow(
      new InvalidValueError(
        'type',
        'must be one of SPLIT, REVERSE_SPLIT, BONUS',
      ),
    );
  });
});

describe('compareTimelineItems (RN09)', () => {
  const op = (date: string, sequence: bigint) =>
    timelineOperation({
      ...validOperation,
      id: `op-${sequence}`,
      date,
      sequence,
    });
  const event = (id: string, exDate: string) =>
    corporateEvent({ id, type: 'SPLIT', exDate, ratioFrom: '1', ratioTo: '2' });

  it('orders by date, then events before operations, then sequence, then event id', () => {
    const items = [
      op('2026-02-01', 2n),
      event('ev-b', '2026-02-01'),
      op('2026-02-01', 1n),
      op('2026-01-05', 9n),
      event('ev-a', '2026-02-01'),
    ];

    expect(
      [...items].sort(compareTimelineItems).map((item) => item.id),
    ).toEqual(['op-9', 'ev-a', 'ev-b', 'op-1', 'op-2']);
  });

  it('returns 0 for the same item', () => {
    const item = op('2026-01-05', 1n);
    const sameEvent = event('ev', '2026-01-05');

    expect(compareTimelineItems(item, item)).toBe(0);
    expect(compareTimelineItems(sameEvent, sameEvent)).toBe(0);
  });

  it('is antisymmetric for items of the same date and kind', () => {
    const first = op('2026-01-05', 1n);
    const second = op('2026-01-05', 2n);
    const eventA = event('ev-a', '2026-01-05');
    const eventB = event('ev-b', '2026-01-05');

    expect(compareTimelineItems(first, second)).toBe(-1);
    expect(compareTimelineItems(second, first)).toBe(1);
    expect(compareTimelineItems(eventA, eventB)).toBe(-1);
    expect(compareTimelineItems(eventB, eventA)).toBe(1);
  });
});

describe('assertQuantityAllowed (RN04 by asset class, D50)', () => {
  const allowed: Record<AssetType, string[]> = {
    STOCK: ['1', '100'],
    FII: ['150'],
    ETF: ['20'],
    BDR: ['3.0'],
    FIXED_INCOME: ['0.52', '1', '10.5'],
    CRYPTO: ['0.0125', '0.00000001', '2'],
  };
  const rejected: [AssetType, string, string][] = [
    ['STOCK', '1.5', 'must be a whole number of units'],
    ['FII', '0.1', 'must be a whole number of units'],
    ['ETF', '2.01', 'must be a whole number of units'],
    ['BDR', '1.000001', 'must be a whole number of units'],
    ['FIXED_INCOME', '0.521', 'must be a multiple of 0.01'],
    ['CRYPTO', '0.000000001', 'must have at most 8 decimal places'],
  ];

  it.each(
    Object.entries(allowed).flatMap(([type, values]) =>
      values.map((v): [AssetType, string] => [type as AssetType, v]),
    ),
  )('accepts %s quantity %s', (assetType, value) => {
    expect(() =>
      assertQuantityAllowed(assetType, Quantity.of(value)),
    ).not.toThrow();
  });

  it.each(rejected)('rejects %s quantity %s', (assetType, value, rule) => {
    expect(() => assertQuantityAllowed(assetType, Quantity.of(value))).toThrow(
      new InvalidQuantityError(assetType, Quantity.of(value), rule),
    );
  });

  it('leaves quantity > 0 to the operation factory (RN04)', () => {
    expect(() =>
      timelineOperation({ ...validOperation, quantity: '0' }),
    ).toThrow('quantity must be greater than zero');
  });

  it('exposes the asset type and rule on the error', () => {
    expect(
      new InvalidQuantityError(
        'STOCK',
        Quantity.of('1.5'),
        'must be a whole number of units',
      ),
    ).toMatchObject({
      code: 'INVALID_QUANTITY',
      assetType: 'STOCK',
      message:
        'Quantity 1.5 is not allowed for STOCK: must be a whole number of units',
    });
  });
});

describe('isAssetType (RN03)', () => {
  it.each([...ASSET_TYPES])('recognizes %s', (value) => {
    expect(isAssetType(value)).toBe(true);
  });

  it.each(['stock', 'REIT', ''])('rejects %j', (value) => {
    expect(isAssetType(value)).toBe(false);
  });
});
