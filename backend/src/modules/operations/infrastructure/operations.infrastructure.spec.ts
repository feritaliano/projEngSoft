import { Prisma } from '../../../generated/prisma/client';
import { LocalDate } from '../../../shared/domain/local-date';
import type { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import type { PortfolioId } from '../../portfolios/domain/portfolio';
import { InconsistentTimelineError } from '../domain/inconsistent-timeline';
import { OperationId, operationDraft } from '../domain/operation';
import { columnsOf, toStoredOperation } from './operation-rows';
import { PrismaOperationHistory } from './prisma-operation-history';
import { PrismaOperationStore } from './prisma-operation-store';

const P1 = '3f1c2b9e-8d4a-4c6f-9b1e-2a7d5c8e0f13' as PortfolioId;
const OP = '9a4e1c27-6d3b-4f80-b5a2-1e7c9d0f3b64' as OperationId;
const PETR4 = '6b0d3a52-1f5e-4f0a-9d7c-3e2b8a1c4d90';
const ITSA4 = '6b0d3a52-1f5e-4f0a-9d7c-3e2b8a1c4d91';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: OP,
    portfolioId: P1,
    assetId: PETR4,
    brokerId: 'b1',
    type: 'BUY' as const,
    tradeDate: new Date('2026-01-05T00:00:00.000Z'),
    sequence: 3n,
    quantity: new Prisma.Decimal('0.00000001'),
    unitPrice: new Prisma.Decimal('29.95'),
    fees: new Prisma.Decimal('5'),
    ...overrides,
  };
}

const DRAFT = operationDraft(
  {
    assetId: PETR4,
    brokerId: 'b1',
    type: 'BUY',
    tradeDate: '2026-01-05',
    quantity: '100',
    unitPrice: '29.95',
    fees: '5.00',
  },
  { assetType: 'STOCK', today: LocalDate.parse('2026-11-09') },
);

/** SQL text of a tagged-template call, with each bound value as `?`. */
function sqlOf(call: unknown[]): { sql: string; values: unknown[] } {
  const [strings, ...values] = call as [TemplateStringsArray, ...unknown[]];
  const query = Prisma.sql(strings, ...values);
  return { sql: query.sql, values: query.values };
}

describe('operation rows', () => {
  it('maps a row to a stored operation, reading decimals in plain notation (D44)', () => {
    const stored = toStoredOperation(row());

    expect(stored.assetId).toBe(PETR4);
    expect(stored.operation).toMatchObject({
      id: OP,
      type: 'BUY',
      sequence: 3n,
    });
    expect(stored.operation.quantity.toString()).toBe('0.00000001');
    expect(stored.operation.date.toString()).toBe('2026-01-05');
  });

  it('reports a stored row that breaks RN04 as a server-side inconsistency', () => {
    expect(() =>
      toStoredOperation(row({ unitPrice: new Prisma.Decimal('0') })),
    ).toThrow(InconsistentTimelineError);
  });

  it('lets an error that is not a rule violation through', () => {
    expect(() => toStoredOperation(row({ quantity: null }))).toThrow(TypeError);
  });

  it('writes a draft as the exact decimal strings and the date at UTC midnight (RN11)', () => {
    expect(columnsOf(DRAFT)).toEqual({
      assetId: PETR4,
      brokerId: 'b1',
      type: 'BUY',
      tradeDate: new Date('2026-01-05T00:00:00.000Z'),
      quantity: '100',
      unitPrice: '29.95',
      fees: '5',
    });
  });
});

function storeWith(tx: Record<string, unknown>) {
  const $transaction = jest.fn(
    (work: (client: unknown) => Promise<unknown>, options: unknown) => {
      void options;
      return work(tx);
    },
  );
  return {
    store: new PrismaOperationStore({
      $transaction,
    } as unknown as PrismaService),
    $transaction,
  };
}

describe('PrismaOperationStore (RN10, lock per portfolio and asset)', () => {
  it('runs writes in a READ COMMITTED transaction', async () => {
    const { store, $transaction } = storeWith({});

    await store.write(() => Promise.resolve('done'));

    expect($transaction.mock.calls[0][1]).toMatchObject({
      isolationLevel: 'ReadCommitted',
    });
  });

  it('locks the portfolio FOR KEY SHARE and tells whether it still exists', async () => {
    const $queryRaw = jest
      .fn()
      .mockResolvedValueOnce([{ id: P1 }])
      .mockResolvedValueOnce([]);
    const { store } = storeWith({ $queryRaw });

    await expect(store.write((tx) => tx.lockPortfolio(P1))).resolves.toBe(true);
    await expect(store.write((tx) => tx.lockPortfolio(P1))).resolves.toBe(
      false,
    );
    expect(sqlOf($queryRaw.mock.calls[0]).sql).toContain('FOR KEY SHARE');
  });

  it('locks the row of an operation of the portfolio FOR UPDATE, then reads it', async () => {
    const $queryRaw = jest
      .fn()
      .mockResolvedValueOnce([{ id: OP }])
      .mockResolvedValueOnce([]);
    const findFirst = jest.fn().mockResolvedValue(row());
    const { store } = storeWith({ $queryRaw, operation: { findFirst } });

    const locked = await store.write((tx) => tx.lockOperation(P1, OP));
    const missing = await store.write((tx) => tx.lockOperation(P1, OP));

    expect(locked?.operation.id).toBe(OP);
    expect(missing).toBeNull();
    const { sql, values } = sqlOf($queryRaw.mock.calls[0]);
    expect(sql).toContain('FOR UPDATE');
    expect(values).toEqual([OP, P1]);
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it('takes one advisory lock per (portfolio, asset) pair, in ascending key order', async () => {
    const $queryRaw = jest
      .fn()
      .mockResolvedValue([
        { key: '42' },
        { key: '-7' },
        { key: '9223372036854775807' },
      ]);
    const $executeRaw = jest.fn().mockResolvedValue(1);
    const { store } = storeWith({ $queryRaw, $executeRaw });

    await store.write((tx) => tx.lockTimelines(P1, [PETR4, ITSA4, PETR4]));

    const keyQuery = sqlOf($queryRaw.mock.calls[0]);
    expect(keyQuery.sql).toContain('hashtextextended');
    expect(keyQuery.values).toEqual([P1, [PETR4, ITSA4, PETR4]]);
    const locked = $executeRaw.mock.calls.map((call) =>
      sqlOf(call as unknown[]),
    );
    expect(
      locked.every(({ sql }) => sql.includes('pg_advisory_xact_lock')),
    ).toBe(true);
    expect(locked.map(({ values }) => values[0])).toEqual([
      '-7',
      '42',
      '9223372036854775807',
    ]);
  });

  it('reads the timeline of one (portfolio, asset) pair (RN12: every broker)', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([row(), row({ id: 'op-2', sequence: 4n })]);
    const { store } = storeWith({ operation: { findMany } });

    const timeline = await store.write((tx) => tx.timelineOf(P1, PETR4));

    expect(timeline).toMatchObject({ portfolioId: P1, assetId: PETR4 });
    expect(timeline.items).toHaveLength(2);
    expect(findMany.mock.calls[0][0]).toMatchObject({
      where: { portfolioId: P1, assetId: PETR4 },
    });
  });

  it('inserts, updates and deletes with the columns of the draft', async () => {
    const create = jest.fn().mockResolvedValue(row());
    const update = jest.fn().mockResolvedValue(row());
    const remove = jest.fn().mockResolvedValue(row());
    const { store } = storeWith({
      operation: { create, update, delete: remove },
    });

    await store.write(async (tx) => {
      await tx.insert(P1, DRAFT);
      await tx.update(OP, DRAFT);
      await tx.delete(OP);
    });

    expect(create.mock.calls[0][0]).toMatchObject({
      data: { portfolioId: P1, quantity: '100', fees: '5' },
    });
    expect(update.mock.calls[0][0]).toMatchObject({
      where: { id: OP },
      data: { unitPrice: '29.95' },
    });
    expect(remove).toHaveBeenCalledWith({ where: { id: OP } });
  });

  it('runs reads read-only in one REPEATABLE READ snapshot (D42)', async () => {
    const $executeRaw = jest.fn().mockResolvedValue(0);
    const findFirst = jest.fn().mockResolvedValue(null);
    const { store, $transaction } = storeWith({
      $executeRaw,
      operation: { findFirst },
    });

    await expect(
      store.read((tx) => tx.findOperation(P1, OP)),
    ).resolves.toBeNull();

    expect(sqlOf($executeRaw.mock.calls[0]).sql).toContain(
      'SET TRANSACTION READ ONLY',
    );
    expect($transaction.mock.calls[0][1]).toMatchObject({
      isolationLevel: 'RepeatableRead',
    });
    expect(findFirst.mock.calls[0][0]).toMatchObject({
      where: { id: OP, portfolioId: P1 },
    });
  });
});

describe('PrismaOperationHistory (B5, D45)', () => {
  function historyWith(rows: unknown[], total: number) {
    const findMany = jest.fn().mockResolvedValue(rows);
    const count = jest.fn().mockResolvedValue(total);
    return {
      history: new PrismaOperationHistory({
        operation: { findMany, count },
      } as unknown as PrismaService),
      findMany,
      count,
    };
  }

  it('pages the most recent first, counting with the same filter', async () => {
    const { history, findMany, count } = historyWith([row()], 9);

    const page = await history.list(P1, {
      assetId: null,
      brokerId: null,
      assetType: null,
      page: 3,
      pageSize: 2,
    });

    expect(page.total).toBe(9);
    expect(page.items[0].operation.id).toBe(OP);
    const query = findMany.mock.calls[0][0] as Record<string, unknown>;
    expect(query).toMatchObject({
      where: { portfolioId: P1 },
      orderBy: [{ tradeDate: 'desc' }, { sequence: 'desc' }],
      skip: 4,
      take: 2,
    });
    expect(count).toHaveBeenCalledWith({ where: query.where });
  });

  it('applies the asset, broker and asset class filters in the query (D45)', async () => {
    const { history, findMany } = historyWith([], 0);

    await history.list(P1, {
      assetId: PETR4,
      brokerId: 'b1',
      assetType: 'FII',
      page: 1,
      pageSize: 50,
    });

    expect(findMany.mock.calls[0][0]).toMatchObject({
      where: {
        portfolioId: P1,
        assetId: PETR4,
        brokerId: 'b1',
        asset: { type: 'FII' },
      },
    });
  });
});
