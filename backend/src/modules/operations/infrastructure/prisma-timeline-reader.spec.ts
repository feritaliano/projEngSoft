import { Prisma } from '../../../generated/prisma/client';
import type { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { InconsistentTimelineError } from '../domain/inconsistent-timeline';
import { PrismaTimelineReader } from './prisma-timeline-reader';

function row(
  overrides: Partial<{
    id: string;
    portfolioId: string;
    assetId: string;
    type: 'BUY' | 'SELL';
    sequence: bigint;
    quantity: string;
  }> = {},
) {
  const { quantity = '100', ...rest } = overrides;
  return {
    id: 'op-1',
    portfolioId: 'p1',
    assetId: 'a1',
    brokerId: 'b1',
    type: 'BUY' as const,
    tradeDate: new Date('2026-01-05T00:00:00.000Z'),
    sequence: 1n,
    unitPrice: new Prisma.Decimal('30.50'),
    fees: new Prisma.Decimal('4.90'),
    ...rest,
    quantity: new Prisma.Decimal(quantity),
  };
}

describe('PrismaTimelineReader (RN09, RN12)', () => {
  it('reads 8-place quantities and sub-cent prices, which Decimal prints in exponent notation (D44)', async () => {
    const reader = new PrismaTimelineReader({
      operation: {
        findMany: jest.fn().mockResolvedValue([
          {
            ...row({ quantity: '0.00000001' }),
            unitPrice: new Prisma.Decimal('0.00000005'),
          },
        ]),
      },
    } as unknown as PrismaService);

    const [timeline] = await reader.timelinesOf(['p1']);
    const [item] = timeline.items;

    expect(item.kind === 'operation' && item.quantity.toString()).toBe(
      '0.00000001',
    );
    expect(item.kind === 'operation' && item.unitPrice.toString()).toBe(
      '0.00000005',
    );
  });

  it('reports a stored row that breaks RN04 as a server-side inconsistency, not as a client field error', async () => {
    const reader = new PrismaTimelineReader({
      operation: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { ...row({ id: 'op-bad' }), unitPrice: new Prisma.Decimal('0') },
          ]),
      },
    } as unknown as PrismaService);

    const failure = reader.timelinesOf(['p1']);

    await expect(failure).rejects.toBeInstanceOf(InconsistentTimelineError);
    await expect(failure).rejects.toThrow(/op-bad/);
  });

  it('also reports an unknown operation type as an inconsistency', async () => {
    const reader = new PrismaTimelineReader({
      operation: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ ...row(), type: 'GIFT' as 'BUY' }]),
      },
    } as unknown as PrismaService);

    await expect(reader.timelinesOf(['p1'])).rejects.toBeInstanceOf(
      InconsistentTimelineError,
    );
  });

  it('lets an error that is not a rule violation through unchanged', async () => {
    const reader = new PrismaTimelineReader({
      operation: {
        findMany: jest.fn().mockResolvedValue([{ ...row(), quantity: null }]),
      },
    } as unknown as PrismaService);

    await expect(reader.timelinesOf(['p1'])).rejects.toBeInstanceOf(TypeError);
  });

  it('reads the operations of all the portfolios in one query and groups them by portfolio and asset', async () => {
    const findMany = jest.fn().mockResolvedValue([
      row({ id: 'op-1', assetId: 'a1' }),
      row({ id: 'op-2', assetId: 'a2', sequence: 2n }),
      row({
        id: 'op-3',
        assetId: 'a1',
        type: 'SELL',
        sequence: 3n,
        quantity: '40',
      }),
      row({ id: 'op-4', portfolioId: 'p2', assetId: 'a1', sequence: 4n }),
    ]);
    const reader = new PrismaTimelineReader({
      operation: { findMany },
    } as unknown as PrismaService);

    const timelines = await reader.timelinesOf(['p1', 'p2']);

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0]).toMatchObject({
      where: { portfolioId: { in: ['p1', 'p2'] } },
    });
    expect(
      timelines.map((t) => [
        t.portfolioId,
        t.assetId,
        t.items.map((i) => i.id),
      ]),
    ).toEqual([
      ['p1', 'a1', ['op-1', 'op-3']],
      ['p1', 'a2', ['op-2']],
      ['p2', 'a1', ['op-4']],
    ]);
  });

  it('keeps the trade date as a calendar date and the decimals exact', async () => {
    const reader = new PrismaTimelineReader({
      operation: {
        findMany: jest
          .fn()
          .mockResolvedValue([row({ quantity: '0.00012345' })]),
      },
    } as unknown as PrismaService);

    const [timeline] = await reader.timelinesOf(['p1']);
    const [item] = timeline.items;

    expect(item.date.toString()).toBe('2026-01-05');
    expect(item.kind === 'operation' && item.quantity.toString()).toBe(
      '0.00012345',
    );
    expect(item.kind === 'operation' && item.unitPrice.toString()).toBe('30.5');
  });
});
