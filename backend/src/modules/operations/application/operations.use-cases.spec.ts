import { InMemoryOperationStore } from '../../../../test/fakes/in-memory-operation-store';
import { Clock } from '../../../shared/domain/clock';
import { InvalidValueError } from '../../../shared/domain/domain-error';
import { LocalDate } from '../../../shared/domain/local-date';
import { GetOwnedPortfolio } from '../../portfolios/application/get-owned-portfolio.use-case';
import { PortfolioNotFoundError } from '../../portfolios/domain/portfolio';
import {
  AssetDirectory,
  BrokerDirectory,
} from '../../reference-data/application/directories';
import type { AssetSummary, Broker } from '../../reference-data/domain/catalog';
import {
  OperationId,
  OperationInput,
  OperationNotFoundError,
  operationDraft,
} from '../domain/operation';
import { HistoryFilter, OperationHistory } from '../domain/operation-history';
import { RuleViolationError } from '../domain/timeline-change';
import { CreateOperation } from './create-operation.use-case';
import { DeleteOperation } from './delete-operation.use-case';
import { GetOperation } from './get-operation.use-case';
import { ListOperations } from './list-operations.use-case';
import {
  MissingReferenceError,
  OperationDetails,
  OperationRejectedError,
  withRejectionDetails,
} from './operation-details';
import { OperationDrafts } from './operation-drafts';
import { PreviewOperation } from './preview-operation.use-case';
import { UpdateOperation } from './update-operation.use-case';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';
const P1 = '3f1c2b9e-8d4a-4c6f-9b1e-2a7d5c8e0f13';
const PETR4 = '6b0d3a52-1f5e-4f0a-9d7c-3e2b8a1c4d90';
const ITSA4 = '6b0d3a52-1f5e-4f0a-9d7c-3e2b8a1c4d91';
const OIBR3 = '6b0d3a52-1f5e-4f0a-9d7c-3e2b8a1c4d92';
const BTC = '6b0d3a52-1f5e-4f0a-9d7c-3e2b8a1c4d93';
const TESOURO = '6b0d3a52-1f5e-4f0a-9d7c-3e2b8a1c4d94';
const P2 = '3f1c2b9e-8d4a-4c6f-9b1e-2a7d5c8e0f14';
const XP = '0c9e7f3a-5b2d-4e81-a6c4-9d1f2b3e4a57';
const RICO = '0c9e7f3a-5b2d-4e81-a6c4-9d1f2b3e4a58';
const MISSING = '00000000-0000-4000-8000-999999999999';
const TODAY = LocalDate.parse('2026-11-09');

function asset(
  id: string,
  ticker: string,
  assetType: AssetSummary['assetType'] = 'STOCK',
): AssetSummary {
  return {
    id,
    ticker,
    assetType,
    displayName: ticker,
    issuer: null,
    sector: null,
  };
}

const ASSETS = new Map<string, AssetSummary>([
  [PETR4, asset(PETR4, 'PETR4')],
  [ITSA4, asset(ITSA4, 'ITSA4')],
  [OIBR3, asset(OIBR3, 'OIBR3')],
  [BTC, asset(BTC, 'BTC', 'CRYPTO')],
  [TESOURO, asset(TESOURO, 'Tesouro IPCA+ 2035', 'FIXED_INCOME')],
]);
/** OIBR3 was deactivated after operations were entered for it. */
const ACTIVE = new Set([PETR4, ITSA4, BTC, TESOURO]);
const BROKERS = new Map<string, Broker>([
  [XP, { id: XP, name: 'XP Investimentos', cnpj: '02332886000104' }],
  [RICO, { id: RICO, name: 'Rico', cnpj: null }],
]);

const assets = {
  findActive: (id: string) =>
    Promise.resolve(ACTIVE.has(id) ? (ASSETS.get(id) ?? null) : null),
  byIds: (ids: readonly string[]) =>
    Promise.resolve(
      new Map(
        ids
          .filter((id) => ASSETS.has(id))
          .map((id) => [id, ASSETS.get(id) as AssetSummary]),
      ),
    ),
} as unknown as AssetDirectory;

const brokers = {
  findById: (id: string) => Promise.resolve(BROKERS.get(id) ?? null),
  byIds: (ids: readonly string[]) =>
    Promise.resolve(
      new Map(
        ids
          .filter((id) => BROKERS.has(id))
          .map((id) => [id, BROKERS.get(id) as Broker]),
      ),
    ),
} as unknown as BrokerDirectory;

class FixedClock extends Clock {
  now(): Date {
    return new Date('2026-11-09T15:00:00Z');
  }
}

/** RN02: only Ana's P1 is owned; anything else is PortfolioNotFoundError, as GetOwnedPortfolio answers. */
const portfolios = {
  ensureOwned: jest.fn((userId: string, portfolioId: string) =>
    userId === ANA && portfolioId === P1
      ? Promise.resolve(P1)
      : Promise.reject(new PortfolioNotFoundError()),
  ),
} as unknown as GetOwnedPortfolio;

function input(overrides: Partial<OperationInput> = {}): OperationInput {
  return {
    assetId: PETR4,
    brokerId: XP,
    type: 'BUY',
    tradeDate: '2026-01-05',
    quantity: '100',
    unitPrice: '29.95',
    fees: '5.00',
    ...overrides,
  };
}

function setup() {
  const store = new InMemoryOperationStore();
  store.portfolios.add(P1);
  const details = new OperationDetails(assets, brokers);
  const drafts = new OperationDrafts(assets, brokers, new FixedClock());
  const seed = (overrides: Partial<OperationInput> = {}) => {
    const value = input(overrides);
    return store.add(
      P1,
      value.assetId,
      operationDraft(value, {
        assetType: ASSETS.get(value.assetId)?.assetType ?? 'STOCK',
        today: TODAY,
      }),
    );
  };
  return {
    store,
    seed,
    details,
    create: new CreateOperation(portfolios, drafts, store, details),
    update: new UpdateOperation(portfolios, drafts, store, details),
    remove: new DeleteOperation(portfolios, store, details),
    get: new GetOperation(portfolios, store, details),
    preview: new PreviewOperation(
      portfolios,
      drafts,
      store,
      details,
      new FixedClock(),
    ),
  };
}

async function rejectionOf(
  promise: Promise<unknown>,
): Promise<OperationRejectedError> {
  const error = await promise.then(
    () => {
      throw new Error('expected a rejection');
    },
    (failure: unknown) => failure,
  );
  expect(error).toBeInstanceOf(OperationRejectedError);
  return error as OperationRejectedError;
}

describe('CreateOperation (B2, B3, RN04, RN07, RN10)', () => {
  it('enters an operation under the locks and returns it with its asset and broker', async () => {
    const { store, create } = setup();

    const view = await create.execute(ANA, P1, input());

    expect(view).toMatchObject({
      type: 'BUY',
      tradeDate: '2026-01-05',
      quantity: '100',
      unitPrice: '29.95',
      fees: '5',
      asset: {
        id: PETR4,
        ticker: 'PETR4',
        displayName: 'PETR4',
        assetType: 'STOCK',
      },
      broker: { id: XP, name: 'XP Investimentos' },
    });
    expect(view.broker).not.toHaveProperty('cnpj');
    expect(store.rows).toHaveLength(1);
    // Lock order (no deadlock, no stale read): portfolio, then the (portfolio, asset) pair, then the read.
    expect(store.calls).toEqual([
      'lock:portfolio',
      `lock:timelines:${PETR4}`,
      `timeline:${PETR4}`,
      'insert',
    ]);
  });

  it('rejects a sell above the position (RN07) with the details of the unsaved sell, and writes nothing', async () => {
    const { store, seed, create } = setup();
    seed();

    const rejection = await rejectionOf(
      create.execute(
        ANA,
        P1,
        input({
          type: 'SELL',
          tradeDate: '2026-10-28',
          quantity: '150',
          unitPrice: '38.50',
        }),
      ),
    );

    expect(rejection.violation).toEqual({
      rule: 'RN07',
      operation: {
        id: null,
        type: 'SELL',
        tradeDate: '2026-10-28',
        quantity: '150',
        asset: {
          id: PETR4,
          ticker: 'PETR4',
          displayName: 'PETR4',
          assetType: 'STOCK',
        },
        broker: { id: XP, name: 'XP Investimentos' },
      },
      availableQuantity: '100',
      soldQuantity: '150',
    });
    expect(rejection.cause).toBeInstanceOf(RuleViolationError);
    expect(store.rows).toHaveLength(1);
  });

  it('rejects a retroactive sell that makes a later sell exceed the position (RN10), naming the later sell', async () => {
    const { seed, create } = setup();
    seed();
    const later = seed({
      type: 'SELL',
      tradeDate: '2026-06-02',
      quantity: '50',
      unitPrice: '38',
      brokerId: RICO,
    });

    const rejection = await rejectionOf(
      create.execute(
        ANA,
        P1,
        input({
          type: 'SELL',
          tradeDate: '2026-03-01',
          quantity: '60',
          unitPrice: '33',
        }),
      ),
    );

    expect(rejection.violation).toMatchObject({
      rule: 'RN10',
      operation: { id: later.operation.id, broker: { name: 'Rico' } },
      availableQuantity: '40',
      soldQuantity: '50',
    });
  });

  it('sums the brokers of the portfolio: selling everything bought at two brokers is allowed (RN12)', async () => {
    const { store, seed, create } = setup();
    seed();
    seed({ brokerId: RICO, tradeDate: '2026-01-06', quantity: '50' });

    await create.execute(
      ANA,
      P1,
      input({
        type: 'SELL',
        tradeDate: '2026-02-01',
        quantity: '150',
        unitPrice: '31',
      }),
    );

    expect(store.rows).toHaveLength(3);
  });

  it('accepts a crypto quantity with 8 decimal places (RN04, D44)', async () => {
    const { create } = setup();

    const view = await create.execute(
      ANA,
      P1,
      input({
        assetId: BTC,
        quantity: '0.00000001',
        unitPrice: '328000.12345678',
        fees: '0',
      }),
    );

    expect(view).toMatchObject({
      quantity: '0.00000001',
      unitPrice: '328000.12345678',
      fees: '0',
    });
  });

  it.each([
    ['assetId', { assetId: MISSING }],
    ['assetId', { assetId: OIBR3 }],
    ['brokerId', { brokerId: MISSING }],
  ])(
    'rejects %s not in the catalog with NOT_FOUND (400, D56), before any write',
    async (field, overrides) => {
      const { store, create } = setup();

      await expect(create.execute(ANA, P1, input(overrides))).rejects.toThrow(
        expect.objectContaining({
          field,
          code: 'NOT_FOUND',
        }) as InvalidValueError,
      );
      expect(store.calls).toEqual([]);
    },
  );

  it('rejects a future trade date in São Paulo (RN04, D54)', async () => {
    const { create } = setup();

    await expect(
      create.execute(ANA, P1, input({ tradeDate: '2026-11-10' })),
    ).rejects.toThrow(
      expect.objectContaining({
        field: 'tradeDate',
        code: 'FUTURE_DATE',
      }) as InvalidValueError,
    );
  });

  it('answers not found for a portfolio of another user before touching the store (RN02)', async () => {
    const { store, create } = setup();

    await expect(create.execute(BRUNO, P1, input())).rejects.toBeInstanceOf(
      PortfolioNotFoundError,
    );
    expect(store.calls).toEqual([]);
  });

  it('answers not found when the portfolio was deleted meanwhile (lock finds no row)', async () => {
    const { store, create } = setup();
    store.portfolios.clear();

    await expect(create.execute(ANA, P1, input())).rejects.toBeInstanceOf(
      PortfolioNotFoundError,
    );
    expect(store.rows).toHaveLength(0);
  });
});

describe('UpdateOperation (B4, RN10)', () => {
  it('changes only the fields sent and keeps the sequence', async () => {
    const { store, seed, update } = setup();
    const buy = seed();

    const view = await update.execute(ANA, P1, buy.operation.id, {
      fees: '0',
      brokerId: RICO,
      quantity: undefined,
    });

    expect(view).toMatchObject({
      id: buy.operation.id,
      quantity: '100',
      fees: '0',
      broker: { name: 'Rico' },
    });
    expect(store.rows[0].operation.sequence).toBe(buy.operation.sequence);
    expect(store.calls).toEqual([
      'read',
      `find:${buy.operation.id}`,
      'lock:portfolio',
      `lock:operation:${buy.operation.id}`,
      `lock:timelines:${PETR4}`,
      `timeline:${PETR4}`,
      `update:${buy.operation.id}`,
    ]);
  });

  /** A write that first commits a concurrent edit of the operation (between the read and the lock). */
  function concurrentEdit(
    store: InMemoryOperationStore,
    id: OperationId,
    overrides: (call: number) => Partial<OperationInput>,
    times = 1,
  ) {
    const write = store.write.bind(store);
    let call = 0;
    const spy = jest.spyOn(store, 'write');
    for (let i = 0; i < times; i += 1) {
      spy.mockImplementationOnce(async (work) => {
        call += 1;
        await write((tx) =>
          tx.update(
            id,
            operationDraft(input(overrides(call)), {
              assetType: 'STOCK',
              today: TODAY,
            }),
          ),
        );
        return write(work);
      });
    }
  }

  it('applies the edit to the operation as locked, keeping a concurrent edit of other fields (no lost update)', async () => {
    const { store, seed, update } = setup();
    const id = seed().operation.id as OperationId;
    concurrentEdit(store, id, () => ({ fees: '7' }));

    const view = await update.execute(ANA, P1, id, { unitPrice: '31' });

    expect(view).toMatchObject({ fees: '7', unitPrice: '31' });
    expect(store.calls.filter((call) => call === 'read')).toHaveLength(1);
  });

  it('starts over when a concurrent edit changed the broker after the read (its catalog check no longer applies)', async () => {
    const { store, seed, update } = setup();
    const id = seed().operation.id as OperationId;
    concurrentEdit(store, id, () => ({ brokerId: RICO }));

    const view = await update.execute(ANA, P1, id, { unitPrice: '31' });

    expect(view).toMatchObject({ unitPrice: '31', broker: { name: 'Rico' } });
    expect(store.calls.filter((call) => call === 'read')).toHaveLength(2);
  });

  it('gives up as a server fault when the broker keeps changing between the read and the lock', async () => {
    const { store, seed, update } = setup();
    const id = seed().operation.id as OperationId;
    concurrentEdit(
      store,
      id,
      (call) => ({ brokerId: call % 2 === 1 ? RICO : XP }),
      3,
    );

    await expect(
      update.execute(ANA, P1, id, { unitPrice: '31' }),
    ).rejects.toThrow(/changed during 3 attempts/);
    expect(store.rows[0].operation.unitPrice.toString()).toBe('29.95');
  });

  it('rejects an edit of a buy that leaves a later sell without units (RN10) and changes nothing', async () => {
    const { store, seed, update } = setup();
    const buy = seed({ quantity: '200' });
    const sell = seed({
      type: 'SELL',
      tradeDate: '2026-05-22',
      quantity: '50',
      unitPrice: '9.88',
    });

    const rejection = await rejectionOf(
      update.execute(ANA, P1, buy.operation.id, { quantity: '40' }),
    );

    expect(rejection.violation).toMatchObject({
      rule: 'RN10',
      operation: { id: sell.operation.id },
      availableQuantity: '40',
      soldQuantity: '50',
    });
    expect(store.rows[0].operation.quantity.toString()).toBe('200');
  });

  it('rejects raising the edited sell above the position as RN07, with its id', async () => {
    const { seed, update } = setup();
    seed();
    const sell = seed({
      type: 'SELL',
      tradeDate: '2026-06-02',
      quantity: '50',
      unitPrice: '38',
    });

    const rejection = await rejectionOf(
      update.execute(ANA, P1, sell.operation.id, { quantity: '120' }),
    );

    expect(rejection.violation).toMatchObject({
      rule: 'RN07',
      operation: { id: sell.operation.id },
    });
  });

  it('moves an operation to another asset validating both timelines, locking both pairs', async () => {
    const { store, seed, update } = setup();
    const buy = seed({ tradeDate: '2026-02-01', quantity: '10' });

    const view = await update.execute(ANA, P1, buy.operation.id, {
      assetId: ITSA4,
    });

    expect(view.asset.ticker).toBe('ITSA4');
    expect(store.calls).toContain(
      `lock:timelines:${[PETR4, ITSA4].sort().join(',')}`,
    );
    expect(store.calls).toEqual(
      expect.arrayContaining([`timeline:${PETR4}`, `timeline:${ITSA4}`]),
    );
  });

  it('rejects moving a buy that the old asset still needs (RN10 in the old timeline)', async () => {
    const { seed, update } = setup();
    const buy = seed();
    seed({
      type: 'SELL',
      tradeDate: '2026-06-02',
      quantity: '50',
      unitPrice: '38',
    });

    const rejection = await rejectionOf(
      update.execute(ANA, P1, buy.operation.id, { assetId: ITSA4 }),
    );

    expect(rejection.violation).toMatchObject({
      rule: 'RN10',
      operation: { asset: { ticker: 'PETR4' } },
    });
  });

  it('rejects moving a sell to an asset without units (RN07 in the new timeline)', async () => {
    const { seed, update } = setup();
    seed();
    const sell = seed({
      type: 'SELL',
      tradeDate: '2026-06-02',
      quantity: '50',
      unitPrice: '38',
    });

    const rejection = await rejectionOf(
      update.execute(ANA, P1, sell.operation.id, { assetId: ITSA4 }),
    );

    expect(rejection.violation).toMatchObject({
      rule: 'RN07',
      operation: { id: sell.operation.id, asset: { ticker: 'ITSA4' } },
      availableQuantity: '0',
    });
  });

  it('keeps an operation editable after its asset was deactivated, but never moves one to an inactive asset', async () => {
    const { seed, update } = setup();
    const oibr = seed({ assetId: OIBR3 });
    const petr = seed();

    await expect(
      update.execute(ANA, P1, oibr.operation.id, { fees: '1' }),
    ).resolves.toMatchObject({ fees: '1' });
    await expect(
      update.execute(ANA, P1, petr.operation.id, { assetId: OIBR3 }),
    ).rejects.toThrow(
      expect.objectContaining({
        field: 'assetId',
        code: 'NOT_FOUND',
      }) as InvalidValueError,
    );
  });

  it('rejects a change to a broker not in the catalog (400)', async () => {
    const { seed, update } = setup();
    const buy = seed();

    await expect(
      update.execute(ANA, P1, buy.operation.id, { brokerId: MISSING }),
    ).rejects.toThrow(
      expect.objectContaining({
        field: 'brokerId',
        code: 'NOT_FOUND',
      }) as InvalidValueError,
    );
  });

  it('reports a stored operation whose asset is missing from the catalog as a server fault', async () => {
    const { store, update } = setup();
    const ghost = store.add(
      P1,
      MISSING,
      operationDraft(input(), { assetType: 'STOCK', today: TODAY }),
    );

    await expect(
      update.execute(ANA, P1, ghost.operation.id, { fees: '1' }),
    ).rejects.toBeInstanceOf(MissingReferenceError);
  });

  it('answers not found for a malformed id without touching the store, and for a missing operation', async () => {
    const { store, update } = setup();

    await expect(update.execute(ANA, P1, 'abc', {})).rejects.toBeInstanceOf(
      OperationNotFoundError,
    );
    expect(store.calls).toEqual([]);
    await expect(update.execute(ANA, P1, MISSING, {})).rejects.toBeInstanceOf(
      OperationNotFoundError,
    );
  });

  it('answers not found when the portfolio was deleted meanwhile', async () => {
    const { store, seed, update } = setup();
    const buy = seed();
    store.portfolios.clear();

    await expect(
      update.execute(ANA, P1, buy.operation.id, {}),
    ).rejects.toBeInstanceOf(PortfolioNotFoundError);
  });
});

describe('DeleteOperation (B4, RN10)', () => {
  it('deletes an operation after recalculating the timeline without it', async () => {
    const { store, seed, remove } = setup();
    const buy = seed();

    await remove.execute(ANA, P1, buy.operation.id);

    expect(store.rows).toHaveLength(0);
    expect(store.calls).toEqual([
      'lock:portfolio',
      `lock:operation:${buy.operation.id}`,
      `lock:timelines:${PETR4}`,
      `timeline:${PETR4}`,
      `delete:${buy.operation.id}`,
    ]);
  });

  it('rejects deleting a buy that a later sell needs (RN10, exclusão de compra)', async () => {
    const { store, seed, remove } = setup();
    const buy = seed();
    const sell = seed({
      type: 'SELL',
      tradeDate: '2026-06-02',
      quantity: '50',
      unitPrice: '38',
    });

    const rejection = await rejectionOf(
      remove.execute(ANA, P1, buy.operation.id),
    );

    expect(rejection.violation).toMatchObject({
      rule: 'RN10',
      operation: { id: sell.operation.id },
      availableQuantity: '0',
    });
    expect(store.rows).toHaveLength(2);
  });

  it('answers not found for a malformed id, a missing operation and a deleted portfolio', async () => {
    const { store, seed, remove } = setup();

    await expect(remove.execute(ANA, P1, 'abc')).rejects.toBeInstanceOf(
      OperationNotFoundError,
    );
    expect(store.calls).toEqual([]);
    await expect(remove.execute(ANA, P1, MISSING)).rejects.toBeInstanceOf(
      OperationNotFoundError,
    );
    const buy = seed();
    store.portfolios.clear();
    await expect(
      remove.execute(ANA, P1, buy.operation.id),
    ).rejects.toBeInstanceOf(PortfolioNotFoundError);
  });
});

describe('GetOperation (frame 5, edit mode)', () => {
  it('returns the operation in a read-only snapshot', async () => {
    const { store, seed, get } = setup();
    const buy = seed();

    await expect(get.execute(ANA, P1, buy.operation.id)).resolves.toMatchObject(
      { id: buy.operation.id, quantity: '100' },
    );
    expect(store.calls).toEqual(['read', `find:${buy.operation.id}`]);
  });

  it('answers not found for a malformed id without reading, and for a missing operation (RN02)', async () => {
    const { store, get } = setup();

    await expect(get.execute(ANA, P1, 'abc')).rejects.toBeInstanceOf(
      OperationNotFoundError,
    );
    expect(store.calls).toEqual([]);
    await expect(get.execute(ANA, P1, MISSING)).rejects.toBeInstanceOf(
      OperationNotFoundError,
    );
    await expect(get.execute(BRUNO, P1, MISSING)).rejects.toBeInstanceOf(
      PortfolioNotFoundError,
    );
  });
});

describe('ListOperations (B5, D45)', () => {
  it('validates the filter, lists the page and joins asset and broker', async () => {
    const { seed, details } = setup();
    const buy = seed();
    const history = {
      list: jest.fn((_portfolioId: string, _filter: HistoryFilter) =>
        Promise.resolve({ items: [buy], total: 9 }),
      ),
    } as unknown as OperationHistory;
    const list = new ListOperations(portfolios, history, details);

    const page = await list.execute(ANA, P1, {
      assetId: null,
      brokerId: null,
      assetType: 'STOCK',
      page: 1,
      pageSize: 50,
    });

    expect(page.total).toBe(9);
    expect(page.items[0]).toMatchObject({
      id: buy.operation.id,
      asset: { ticker: 'PETR4' },
      broker: { name: 'XP Investimentos' },
    });
    expect(history.list).toHaveBeenCalledWith(P1, {
      assetId: null,
      brokerId: null,
      assetType: 'STOCK',
      page: 1,
      pageSize: 50,
    });
  });

  it('rejects an invalid filter with its field before querying', async () => {
    const history = { list: jest.fn() } as unknown as OperationHistory;
    const list = new ListOperations(portfolios, history, setup().details);

    await expect(
      list.execute(ANA, P1, {
        assetId: null,
        brokerId: null,
        assetType: 'BOND',
        page: 1,
        pageSize: 50,
      }),
    ).rejects.toThrow(
      expect.objectContaining({ field: 'assetType' }) as InvalidValueError,
    );
    expect(history.list).not.toHaveBeenCalled();
  });
});

describe('OperationDetails', () => {
  it('reports an operation whose broker is missing from the catalog as a server fault', async () => {
    const { store, details } = setup();
    const row = store.add(
      P1,
      PETR4,
      operationDraft(input({ brokerId: MISSING }), {
        assetType: 'STOCK',
        today: TODAY,
      }),
    );

    await expect(details.view(row)).rejects.toBeInstanceOf(
      MissingReferenceError,
    );
  });

  it('lets errors that are not rule violations through withRejectionDetails unchanged', async () => {
    const failure = new Error('database down');

    await expect(
      withRejectionDetails(Promise.reject(failure), setup().details),
    ).rejects.toBe(failure);
  });
});

describe('PreviewOperation (D42, RN04, RN07, RN10)', () => {
  /** Rows as they were: the preview must never change the store. */
  function snapshot(store: InMemoryOperationStore) {
    return store.rows.map((row) => ({
      ...row.operation,
      assetId: row.assetId,
    }));
  }

  it('previews a buy in one read-only snapshot: no lock, no write, nothing changed', async () => {
    const { store, seed, preview } = setup();
    seed();
    const before = snapshot(store);
    store.calls.length = 0;

    const result = await preview.execute(
      ANA,
      P1,
      input({
        tradeDate: '2026-02-01',
        quantity: '100',
        unitPrice: '32',
        fees: '0',
      }),
      null,
    );

    expect(result).toMatchObject({
      grossAmount: {
        value: '3200',
        formulaCode: 'OPERATION_GROSS',
        asOf: '2026-11-09',
      },
      netAmount: { value: '3200', formulaCode: 'OPERATION_TOTAL_BUY' },
      positionBefore: '100',
      positionAfter: '200',
      averagePriceBefore: { value: '30', formulaCode: 'AVG_PRICE_BUY' },
      averagePriceAfter: { value: '31', formulaCode: 'AVG_PRICE_BUY' },
    });
    expect(result).not.toHaveProperty('realizedProfit');
    expect(result).not.toHaveProperty('violation');
    expect(store.calls).toEqual(['read', `timeline:${PETR4}`]);
    expect(snapshot(store)).toEqual(before);
  });

  it('previews a sell with the estimated profit (RN06)', async () => {
    const { seed, preview } = setup();
    seed();

    const result = await preview.execute(
      ANA,
      P1,
      input({
        type: 'SELL',
        tradeDate: '2026-06-02',
        quantity: '40',
        unitPrice: '38.50',
        fees: '4.90',
      }),
      null,
    );

    expect(result).toMatchObject({
      netAmount: { value: '1535.1', formulaCode: 'OPERATION_NET_SELL' },
      positionBefore: '100',
      positionAfter: '60',
      averagePriceAfter: { value: '30' },
      realizedProfit: { value: '335.1', formulaCode: 'REALIZED_PROFIT' },
    });
  });

  it('previews a total sell: position 0 and no PM after it (RN08)', async () => {
    const { seed, preview } = setup();
    seed();

    const result = await preview.execute(
      ANA,
      P1,
      input({
        type: 'SELL',
        tradeDate: '2026-06-02',
        quantity: '100',
        unitPrice: '38.50',
        fees: '0',
      }),
      null,
    );

    expect(result).toMatchObject({
      positionAfter: '0',
      averagePriceAfter: null,
      realizedProfit: { value: '850' },
    });
  });

  it('answers a sell above the position with the RN07 violation of the 422 (id null), not an error', async () => {
    const { store, seed, preview } = setup();
    seed();

    const result = await preview.execute(
      ANA,
      P1,
      input({
        type: 'SELL',
        tradeDate: '2026-06-02',
        quantity: '150',
        unitPrice: '38.50',
      }),
      null,
    );

    expect(result).toMatchObject({
      positionBefore: '100',
      positionAfter: null,
      averagePriceAfter: null,
      realizedProfit: null,
      violation: {
        rule: 'RN07',
        operation: {
          id: null,
          type: 'SELL',
          tradeDate: '2026-06-02',
          quantity: '150',
          asset: { id: PETR4, ticker: 'PETR4' },
          broker: { id: XP, name: 'XP Investimentos' },
        },
        availableQuantity: '100',
        soldQuantity: '150',
      },
    });
    expect(store.rows).toHaveLength(1);
  });

  it('answers a retroactive sell that leaves a later sell above the position with RN10 naming it, and full values', async () => {
    const { seed, preview } = setup();
    seed();
    const later = seed({
      type: 'SELL',
      tradeDate: '2026-08-01',
      quantity: '80',
      unitPrice: '40',
    });

    const result = await preview.execute(
      ANA,
      P1,
      input({
        type: 'SELL',
        tradeDate: '2026-06-02',
        quantity: '40',
        unitPrice: '38.50',
        fees: '0',
      }),
      null,
    );

    expect(result).toMatchObject({
      positionBefore: '100',
      positionAfter: '60',
      realizedProfit: { value: '340' },
      violation: {
        rule: 'RN10',
        operation: { id: later.operation.id, tradeDate: '2026-08-01' },
        availableQuantity: '60',
        soldQuantity: '80',
      },
    });
  });

  it('gives the same violation as the command would (RN10)', async () => {
    const { seed, preview, create } = setup();
    seed();
    seed({
      type: 'SELL',
      tradeDate: '2026-08-01',
      quantity: '80',
      unitPrice: '40',
    });
    const body = input({
      type: 'SELL',
      tradeDate: '2026-06-02',
      quantity: '40',
      unitPrice: '38.50',
    });

    const result = await preview.execute(ANA, P1, body, null);
    const rejection = await rejectionOf(create.execute(ANA, P1, body));

    expect(result.violation).toEqual(rejection.violation);
  });

  it('previews an edit with replacesOperationId: the stored operation leaves the timeline and the form takes its place', async () => {
    const { store, seed, preview } = setup();
    const buy = seed({ quantity: '200' });
    const sell = seed({
      type: 'SELL',
      tradeDate: '2026-05-22',
      quantity: '50',
      unitPrice: '9.88',
    });
    const before = snapshot(store);
    store.calls.length = 0;

    const result = await preview.execute(
      ANA,
      P1,
      input({ quantity: '40' }),
      buy.operation.id,
    );

    expect(result).toMatchObject({
      grossAmount: {
        value: '1198',
        inputs: [{ name: 'quantity', operation: { id: buy.operation.id } }, {}],
      },
      positionBefore: '0',
      positionAfter: '40',
      violation: {
        rule: 'RN10',
        operation: { id: sell.operation.id },
        availableQuantity: '40',
        soldQuantity: '50',
      },
    });
    expect(store.calls).toEqual([
      'read',
      `find:${buy.operation.id}`,
      'read',
      `find:${buy.operation.id}`,
      `timeline:${PETR4}`,
    ]);
    expect(snapshot(store)).toEqual(before);
  });

  it('previews an edit that moves the operation to another asset: the old timeline is checked first (RN10)', async () => {
    const { seed, preview } = setup();
    const buy = seed();
    const sell = seed({
      type: 'SELL',
      tradeDate: '2026-05-22',
      quantity: '50',
      unitPrice: '38',
    });

    const result = await preview.execute(
      ANA,
      P1,
      input({ assetId: ITSA4 }),
      buy.operation.id,
    );

    expect(result).toMatchObject({
      positionBefore: '0',
      positionAfter: '100',
      averagePriceAfter: { value: '30' },
      violation: {
        rule: 'RN10',
        operation: { id: sell.operation.id, asset: { id: PETR4 } },
      },
    });
  });

  it('previews fractional quantities of crypto and fixed income by the rule of their class (RN04, D55)', async () => {
    const { preview } = setup();

    const crypto = await preview.execute(
      ANA,
      P1,
      input({
        assetId: BTC,
        quantity: '0.0125',
        unitPrice: '350000',
        fees: '0',
      }),
      null,
    );
    const bond = await preview.execute(
      ANA,
      P1,
      input({
        assetId: TESOURO,
        quantity: '0.52',
        unitPrice: '2500',
        fees: '0',
      }),
      null,
    );

    expect(crypto).toMatchObject({
      grossAmount: { value: '4375' },
      positionAfter: '0.0125',
    });
    expect(bond).toMatchObject({
      grossAmount: { value: '1300' },
      positionAfter: '0.52',
    });
    await expect(
      preview.execute(
        ANA,
        P1,
        input({ assetId: TESOURO, quantity: '0.525' }),
        null,
      ),
    ).rejects.toMatchObject({ field: 'quantity', code: 'INVALID_STEP' });
  });

  it('sums the brokers of the portfolio and names each one in the trace (RN12)', async () => {
    const { seed, preview } = setup();
    seed({ brokerId: RICO });

    const result = await preview.execute(
      ANA,
      P1,
      input({
        type: 'SELL',
        tradeDate: '2026-06-02',
        quantity: '40',
        unitPrice: '38.50',
      }),
      null,
    );

    expect(result).toMatchObject({
      positionBefore: '100',
      averagePriceAfter: {
        inputs: [
          {},
          {},
          { name: 'quantityBought', operation: { broker: { name: 'Rico' } } },
          {},
          {},
        ],
      },
      realizedProfit: {
        inputs: [
          {
            name: 'quantitySold',
            operation: { broker: { name: 'XP Investimentos' } },
          },
          {},
          {},
          {},
        ],
      },
    });
  });

  it('keeps every decimal place of crypto, unrounded, and rejects a fractional sell above the position (RN11, RN07)', async () => {
    const { seed, preview } = setup();
    seed({
      assetId: BTC,
      quantity: '0.0125',
      unitPrice: '350000',
      fees: '0',
    });

    const buy = await preview.execute(
      ANA,
      P1,
      input({
        assetId: BTC,
        quantity: '0.00012345',
        unitPrice: '351234.56789',
        fees: '0',
      }),
      null,
    );
    const sell = await preview.execute(
      ANA,
      P1,
      input({
        assetId: BTC,
        type: 'SELL',
        tradeDate: '2026-06-02',
        quantity: '0.0126',
        unitPrice: '360000',
        fees: '0',
      }),
      null,
    );

    expect(buy).toMatchObject({
      grossAmount: { value: '43.3599074060205' },
      positionAfter: '0.01262345',
    });
    expect(sell).toMatchObject({
      positionBefore: '0.0125',
      positionAfter: null,
      violation: {
        rule: 'RN07',
        availableQuantity: '0.0125',
        soldQuantity: '0.0126',
      },
    });
  });

  it('validates the body as the command does (RN04, D56): 400 with the field and code', async () => {
    const { preview } = setup();

    await expect(
      preview.execute(ANA, P1, input({ tradeDate: '2026-11-10' }), null),
    ).rejects.toMatchObject({ field: 'tradeDate', code: 'FUTURE_DATE' });
    await expect(
      preview.execute(ANA, P1, input({ brokerId: MISSING }), null),
    ).rejects.toMatchObject({ field: 'brokerId', code: 'NOT_FOUND' });
  });

  it.each([
    ['malformed', 'abc'],
    ['missing', MISSING],
  ])(
    'answers a %s replacesOperationId as NOT_FOUND on that field (D56)',
    async (_kind, id) => {
      const { preview } = setup();

      const error = await preview
        .execute(ANA, P1, input(), id)
        .catch((failure: unknown) => failure);

      expect(error).toBeInstanceOf(InvalidValueError);
      expect(error).toMatchObject({
        field: 'replacesOperationId',
        code: 'NOT_FOUND',
      });
    },
  );

  it('answers NOT_FOUND for an operation of another portfolio (RN02)', async () => {
    const { store, preview } = setup();
    store.portfolios.add(P2);
    const other = store.add(
      P2,
      PETR4,
      operationDraft(input(), { assetType: 'STOCK', today: TODAY }),
    );

    await expect(
      preview.execute(ANA, P1, input(), other.operation.id),
    ).rejects.toMatchObject({
      field: 'replacesOperationId',
      code: 'NOT_FOUND',
    });
  });

  it('answers NOT_FOUND when the operation is deleted between the catalog checks and the snapshot', async () => {
    const { store, seed, preview } = setup();
    const buy = seed();
    const read = store.read.bind(store);
    jest
      .spyOn(store, 'read')
      .mockImplementationOnce((work) => read(work))
      .mockImplementationOnce((work) => {
        store.rows = [];
        return read(work);
      });

    await expect(
      preview.execute(ANA, P1, input(), buy.operation.id),
    ).rejects.toMatchObject({
      field: 'replacesOperationId',
      code: 'NOT_FOUND',
    });
  });

  it('answers not found for a portfolio of another user before reading anything (RN02)', async () => {
    const { store, preview } = setup();

    await expect(
      preview.execute(BRUNO, P1, input(), null),
    ).rejects.toBeInstanceOf(PortfolioNotFoundError);
    expect(store.calls).toEqual([]);
  });
});
