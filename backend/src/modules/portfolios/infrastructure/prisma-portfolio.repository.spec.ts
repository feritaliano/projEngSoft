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

  it('lists the portfolios of the user by creation, with the operation count of the query', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([
        { id: 'p1', name: 'Longo prazo', _count: { operations: 11 } },
      ]);

    await expect(repositoryWith({ findMany }).listOwned('u1')).resolves.toEqual(
      [{ id: 'p1', name: 'Longo prazo', operationCount: 11 }],
    );
    expect(findMany.mock.calls[0][0]).toMatchObject({
      where: { userId: 'u1' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  });

  it('finds a portfolio only together with its owner', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce({ id: 'p1', name: 'A', _count: { operations: 2 } })
      .mockResolvedValueOnce(null);
    const repository = repositoryWith({ findFirst });

    await expect(repository.findOwned('u1', P1)).resolves.toEqual({
      id: 'p1',
      name: 'A',
      operationCount: 2,
    });
    await expect(repository.findOwned('u2', P1)).resolves.toBeNull();
    expect(findFirst.mock.calls[1][0]).toMatchObject({
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
