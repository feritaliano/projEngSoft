import { Prisma } from '../../../generated/prisma/client';
import type { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import {
  PortfolioId,
  PortfolioName,
  PortfolioNameTakenError,
} from '../domain/portfolio';

const P1 = 'p1' as PortfolioId;
import { PrismaPortfolioRepository } from './prisma-portfolio.repository';

function repositoryWith(portfolio: Record<string, jest.Mock>) {
  return new PrismaPortfolioRepository({
    portfolio,
  } as unknown as PrismaService);
}

function knownError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('failed', {
    code,
    clientVersion: 'test',
  });
}

describe('PrismaPortfolioRepository (RN02, D41)', () => {
  it('creates the portfolio for the user with the trimmed name', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'p1', name: 'Renda' });

    await expect(
      repositoryWith({ create }).create('u1', PortfolioName.of(' Renda ')),
    ).resolves.toEqual({ id: 'p1', name: 'Renda' });
    expect(create.mock.calls[0][0]).toMatchObject({
      data: { userId: 'u1', name: 'Renda' },
    });
  });

  it('maps the unique violation of (user_id, name) to PortfolioNameTakenError', async () => {
    const create = jest.fn().mockRejectedValue(knownError('P2002'));

    await expect(
      repositoryWith({ create }).create('u1', PortfolioName.of('Renda')),
    ).rejects.toBeInstanceOf(PortfolioNameTakenError);
  });

  it('lets any other database error through', async () => {
    const failure = knownError('P2003');
    const create = jest.fn().mockRejectedValue(failure);

    await expect(
      repositoryWith({ create }).create('u1', PortfolioName.of('Renda')),
    ).rejects.toBe(failure);
  });

  // $queryRaw is a tagged template: the mock gets the strings and the values, rebuilt here as the Sql it runs.
  function sqlOf(
    queryRaw: jest.Mock,
    call = 0,
  ): { sql: string; values: unknown[] } {
    const [strings, ...values] = queryRaw.mock.calls[call] as [
      TemplateStringsArray,
      ...unknown[],
    ];
    const query = Prisma.sql(strings, ...values);
    return { sql: query.sql, values: query.values };
  }

  it('lists the portfolios of the user by creation, with the count and last date of the operations in one query (D41)', async () => {
    const $queryRaw = jest.fn().mockResolvedValue([
      {
        id: 'p1',
        name: 'Longo prazo',
        operation_count: 9,
        last_trade_date: new Date('2026-10-28T00:00:00.000Z'),
      },
      { id: 'p2', name: 'Vazia', operation_count: 0, last_trade_date: null },
    ]);
    const repository = new PrismaPortfolioRepository({
      $queryRaw,
    } as unknown as PrismaService);

    await expect(repository.listOwned('u1')).resolves.toEqual([
      {
        id: 'p1',
        name: 'Longo prazo',
        operationCount: 9,
        lastTradeDate: '2026-10-28',
      },
      { id: 'p2', name: 'Vazia', operationCount: 0, lastTradeDate: null },
    ]);
    const { sql, values } = sqlOf($queryRaw);
    expect(sql).toContain('LEFT JOIN operations o');
    expect(sql).toContain('max(o.trade_date)');
    expect(sql).toContain('ORDER BY p.created_at ASC, p.id ASC');
    expect(values).toEqual(['u1']);
  });

  it('finds a portfolio only together with its owner', async () => {
    const $queryRaw = jest
      .fn()
      .mockResolvedValueOnce([
        { id: 'p1', name: 'A', operation_count: 2, last_trade_date: null },
      ])
      .mockResolvedValueOnce([]);
    const repository = new PrismaPortfolioRepository({
      $queryRaw,
    } as unknown as PrismaService);

    await expect(repository.findOwned('u1', P1)).resolves.toEqual({
      id: 'p1',
      name: 'A',
      operationCount: 2,
      lastTradeDate: null,
    });
    await expect(repository.findOwned('u2', P1)).resolves.toBeNull();
    const { sql, values } = sqlOf($queryRaw, 1);
    expect(sql).toContain('WHERE p.id = ?::uuid AND p.user_id = ?::uuid');
    expect(values).toEqual(['p1', 'u2']);
  });

  it('checks ownership with the owner in the WHERE, without counting (K4)', async () => {
    const count = jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const repository = repositoryWith({ count });

    await expect(repository.existsOwned('u1', P1)).resolves.toBe(true);
    await expect(repository.existsOwned('u2', P1)).resolves.toBe(false);
    expect(count.mock.calls[1][0]).toEqual({
      where: { id: 'p1', userId: 'u2' },
    });
  });

  it('deletes with the owner in the WHERE and reports whether a row went', async () => {
    const deleteMany = jest
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const repository = repositoryWith({ deleteMany });

    await expect(repository.deleteOwned('u1', P1)).resolves.toBe(true);
    await expect(repository.deleteOwned('u2', P1)).resolves.toBe(false);
    expect(deleteMany.mock.calls[1][0]).toEqual({
      where: { id: 'p1', userId: 'u2' },
    });
  });
});
