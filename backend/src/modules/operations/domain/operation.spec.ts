import { InvalidValueError } from '../../../shared/domain/domain-error';
import { LocalDate } from '../../../shared/domain/local-date';
import { Quantity } from '../../../shared/domain/quantity';
import {
  COLUMN_LIMITS,
  draftAsTimelineItem,
  inputOf,
  OperationInput,
  operationDraft,
  parseOperationId,
} from './operation';
import { InvalidQuantityError } from './quantity-rules';

const TODAY = LocalDate.parse('2026-11-09');
const STOCK = { assetType: 'STOCK' as const, today: TODAY };

function input(overrides: Partial<OperationInput> = {}): OperationInput {
  return {
    assetId: 'asset-petr4',
    brokerId: 'broker-xp',
    type: 'BUY',
    tradeDate: '2026-01-05',
    quantity: '100',
    unitPrice: '29.95',
    fees: '5.00',
    ...overrides,
  };
}

describe('operationDraft (RN04)', () => {
  it('builds a validated draft with Decimal values', () => {
    const draft = operationDraft(input(), STOCK);

    expect(draft).toMatchObject({
      assetId: 'asset-petr4',
      brokerId: 'broker-xp',
      type: 'BUY',
    });
    expect(draft.tradeDate.toString()).toBe('2026-01-05');
    expect(draft.quantity.toString()).toBe('100');
    expect(draft.unitPrice.toString()).toBe('29.95');
    expect(draft.fees.toString()).toBe('5');
  });

  it('accepts a trade date of today (D54)', () => {
    expect(
      operationDraft(
        input({ tradeDate: '2026-11-09' }),
        STOCK,
      ).tradeDate.toString(),
    ).toBe('2026-11-09');
  });

  it('rejects a trade date after today in São Paulo (RN04, D54)', () => {
    expect(() =>
      operationDraft(input({ tradeDate: '2026-11-10' }), STOCK),
    ).toThrow(
      expect.objectContaining({
        field: 'tradeDate',
        code: 'FUTURE_DATE',
        params: { today: '2026-11-09' },
      }) as InvalidValueError,
    );
  });

  it('names the tradeDate field when the date is malformed', () => {
    expect(() =>
      operationDraft(input({ tradeDate: '2026-02-30' }), STOCK),
    ).toThrow(expect.objectContaining({ field: 'tradeDate' }) as Error);
  });

  it.each([
    ['type', 'INVALID_VALUE', { type: 'GIFT' }],
    ['quantity', 'NOT_POSITIVE', { quantity: '0' }],
    ['unitPrice', 'NOT_POSITIVE', { unitPrice: '0' }],
    ['fees', 'NEGATIVE', { fees: '-1' }],
  ])(
    'rejects an invalid %s with its field and code %s (RN04, D56)',
    (field, code, overrides) => {
      expect(() => operationDraft(input(overrides), STOCK)).toThrow(
        expect.objectContaining({ field, code }) as Error,
      );
    },
  );

  it('accepts zero fees', () => {
    expect(operationDraft(input({ fees: '0' }), STOCK).fees.isZero()).toBe(
      true,
    );
  });

  it.each([
    ['STOCK', '10.5', 'NOT_INTEGER'],
    ['FII', '0.1', 'NOT_INTEGER'],
    ['ETF', '1.00000001', 'NOT_INTEGER'],
    ['BDR', '3.3', 'NOT_INTEGER'],
    ['FIXED_INCOME', '0.525', 'INVALID_STEP'],
    ['CRYPTO', '0.000000001', 'TOO_MANY_DECIMALS'],
  ] as const)(
    'rejects a %s quantity of %s against the rule of its class with %s (RN04, D50, D56)',
    (assetType, quantity, code) => {
      expect(() =>
        operationDraft(input({ quantity }), { assetType, today: TODAY }),
      ).toThrow(
        expect.objectContaining({
          field: 'quantity',
          code,
        }) as InvalidQuantityError,
      );
    },
  );

  it.each([
    ['FIXED_INCOME', '0.52'],
    ['CRYPTO', '0.00000001'],
    ['CRYPTO', '0.0125'],
  ] as const)(
    'accepts a fractional %s quantity of %s (D44)',
    (assetType, quantity) => {
      expect(
        operationDraft(input({ quantity }), {
          assetType,
          today: TODAY,
        }).quantity.toString(),
      ).toBe(quantity);
    },
  );

  it('accepts prices with up to 8 decimal places (column NUMERIC(20,8))', () => {
    expect(
      operationDraft(
        input({ unitPrice: '0.00000005' }),
        STOCK,
      ).unitPrice.toString(),
    ).toBe('0.00000005');
  });

  it.each([
    [
      'unitPrice',
      { unitPrice: '1.123456789' },
      'TOO_MANY_DECIMALS',
      { maxDecimals: 8 },
    ],
    ['fees', { fees: '4.905' }, 'TOO_MANY_DECIMALS', { maxDecimals: 2 }],
    [
      'quantity',
      { quantity: '1000000000000' },
      'TOO_LARGE',
      { maxIntegerDigits: 12 },
    ],
    [
      'unitPrice',
      { unitPrice: '1000000000000' },
      'TOO_LARGE',
      { maxIntegerDigits: 12 },
    ],
    [
      'fees',
      { fees: '10000000000000000' },
      'TOO_LARGE',
      { maxIntegerDigits: 16 },
    ],
  ])(
    'rejects a %s the column would round or overflow (RN11, D56)',
    (field, overrides, code, params) => {
      expect(() => operationDraft(input(overrides), STOCK)).toThrow(
        expect.objectContaining({ field, code, params }) as InvalidValueError,
      );
    },
  );

  it('accepts the largest values the columns hold', () => {
    expect(() =>
      operationDraft(
        input({
          quantity: '999999999999',
          unitPrice: '999999999999.99999999',
          fees: '9999999999999999.99',
        }),
        STOCK,
      ),
    ).not.toThrow();
    expect(COLUMN_LIMITS.fees).toEqual({ integerDigits: 16, decimalPlaces: 2 });
  });
});

describe('draftAsTimelineItem and inputOf', () => {
  it('turns a draft into a timeline item with the given identity, and back into the input of an edit', () => {
    const draft = operationDraft(input({ type: 'SELL' }), STOCK);

    const item = draftAsTimelineItem(draft, 'op-1', 7n);

    expect(item).toMatchObject({
      id: 'op-1',
      sequence: 7n,
      type: 'SELL',
      brokerId: 'broker-xp',
    });
    expect(item.quantity.equals(Quantity.of('100'))).toBe(true);
    expect(inputOf({ assetId: 'asset-petr4', operation: item })).toEqual({
      assetId: 'asset-petr4',
      brokerId: 'broker-xp',
      type: 'SELL',
      tradeDate: '2026-01-05',
      quantity: '100',
      unitPrice: '29.95',
      fees: '5',
    });
  });
});

describe('parseOperationId (RN02)', () => {
  it('accepts a uuid and refuses anything else, so a malformed id is a 404 and never reaches the database', () => {
    expect(parseOperationId('9a4e1c27-6d3b-4f80-b5a2-1e7c9d0f3b64')).toBe(
      '9a4e1c27-6d3b-4f80-b5a2-1e7c9d0f3b64',
    );
    expect(parseOperationId('abc')).toBeNull();
  });
});
