import { InvalidValueError } from '../../../shared/domain/domain-error';
import {
  CountOpenPositions,
  InconsistentTimelineError,
} from '../../operations/application/count-open-positions';
import {
  Portfolio,
  PortfolioName,
  PortfolioNameTakenError,
  PortfolioNotFoundError,
  PortfolioRepository,
  PortfolioWithOperationCount,
} from '../domain/portfolio';
import { CreatePortfolio } from './create-portfolio.use-case';
import { DeletePortfolio } from './delete-portfolio.use-case';
import { GetOwnedPortfolio } from './get-owned-portfolio.use-case';
import { ListPortfolios } from './list-portfolios.use-case';

const ANA = 'user-ana';
const BRUNO = 'user-bruno';
const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

interface Row extends PortfolioWithOperationCount {
  userId: string;
}

class InMemoryPortfolios extends PortfolioRepository {
  readonly rows: Row[] = [];
  readonly calls: string[] = [];

  create(userId: string, name: PortfolioName): Promise<Portfolio> {
    if (
      this.rows.some((r) => r.userId === userId && r.name === name.toString())
    ) {
      return Promise.reject(new PortfolioNameTakenError());
    }
    const row = {
      id: ID(this.rows.length + 1),
      userId,
      name: name.toString(),
      operationCount: 0,
    };
    this.rows.push(row);
    return Promise.resolve({ id: row.id, name: row.name });
  }

  listOwned(userId: string): Promise<PortfolioWithOperationCount[]> {
    return Promise.resolve(
      this.rows
        .filter((r) => r.userId === userId)
        .map(({ id, name, operationCount }) => ({ id, name, operationCount })),
    );
  }

  findOwned(
    userId: string,
    portfolioId: string,
  ): Promise<PortfolioWithOperationCount | null> {
    this.calls.push(`find:${userId}:${portfolioId}`);
    const row = this.rows.find(
      (r) => r.id === portfolioId && r.userId === userId,
    );
    return Promise.resolve(
      row
        ? { id: row.id, name: row.name, operationCount: row.operationCount }
        : null,
    );
  }

  deleteOwned(userId: string, portfolioId: string): Promise<boolean> {
    this.calls.push(`delete:${userId}:${portfolioId}`);
    const index = this.rows.findIndex(
      (r) => r.id === portfolioId && r.userId === userId,
    );
    if (index < 0) {
      return Promise.resolve(false);
    }
    this.rows.splice(index, 1);
    return Promise.resolve(true);
  }
}

/** Open positions per portfolio, as the operations module would derive them. */
function openPositions(counts: Record<string, number>): CountOpenPositions {
  return {
    byPortfolio: jest.fn((ids: readonly string[]) =>
      Promise.resolve(new Map(ids.map((id) => [id, counts[id] ?? 0]))),
    ),
  } as unknown as CountOpenPositions;
}

function seed(repository: InMemoryPortfolios, rows: Row[]): void {
  repository.rows.push(...rows);
}

describe('CreatePortfolio (B1, RN02)', () => {
  it('creates an empty portfolio with the trimmed name', async () => {
    const repository = new InMemoryPortfolios();

    const created = await new CreatePortfolio(repository).execute(
      ANA,
      '  Longo prazo ',
    );

    expect(created).toEqual({
      id: ID(1),
      name: 'Longo prazo',
      operationCount: 0,
      assetCount: 0,
    });
    expect(repository.rows[0].userId).toBe(ANA);
  });

  it('rejects a duplicated name of the same user (RN02)', async () => {
    const repository = new InMemoryPortfolios();
    const create = new CreatePortfolio(repository);
    await create.execute(ANA, 'Longo prazo');

    await expect(create.execute(ANA, ' Longo prazo')).rejects.toBeInstanceOf(
      PortfolioNameTakenError,
    );
  });

  it('lets another user use the same name (RN02 is per user)', async () => {
    const repository = new InMemoryPortfolios();
    const create = new CreatePortfolio(repository);
    await create.execute(ANA, 'Longo prazo');

    await expect(create.execute(BRUNO, 'Longo prazo')).resolves.toMatchObject({
      name: 'Longo prazo',
    });
  });

  it('rejects a blank name before reaching the repository', async () => {
    const repository = new InMemoryPortfolios();

    await expect(
      new CreatePortfolio(repository).execute(ANA, '   '),
    ).rejects.toBeInstanceOf(InvalidValueError);
    expect(repository.rows).toHaveLength(0);
  });
});

describe('ListPortfolios (B1, D41)', () => {
  it('lists only the portfolios of the user, with operationCount and assetCount', async () => {
    const repository = new InMemoryPortfolios();
    seed(repository, [
      { id: ID(1), userId: ANA, name: 'Longo prazo', operationCount: 11 },
      { id: ID(2), userId: BRUNO, name: 'Outro', operationCount: 3 },
      { id: ID(3), userId: ANA, name: 'Testes FII', operationCount: 0 },
    ]);
    const positions = openPositions({ [ID(1)]: 6, [ID(2)]: 2 });

    const list = await new ListPortfolios(repository, positions).execute(ANA);

    expect(list).toEqual([
      { id: ID(1), name: 'Longo prazo', operationCount: 11, assetCount: 6 },
      { id: ID(3), name: 'Testes FII', operationCount: 0, assetCount: 0 },
    ]);
    expect(positions.byPortfolio).toHaveBeenCalledWith([ID(1), ID(3)]);
  });
});

describe('ListPortfolios with inconsistent stored operations (RN10)', () => {
  it('lets the error through instead of answering a smaller assetCount', async () => {
    const repository = new InMemoryPortfolios();
    seed(repository, [
      { id: ID(1), userId: ANA, name: 'Longo prazo', operationCount: 2 },
    ]);
    const failing = {
      byPortfolio: () =>
        Promise.reject(new InconsistentTimelineError(ID(1), 'PETR4')),
    } as unknown as CountOpenPositions;

    await expect(
      new ListPortfolios(repository, failing).execute(ANA),
    ).rejects.toBeInstanceOf(InconsistentTimelineError);
  });
});

describe('GetOwnedPortfolio (RN02)', () => {
  const repository = new InMemoryPortfolios();
  seed(repository, [
    { id: ID(1), userId: ANA, name: 'Longo prazo', operationCount: 11 },
  ]);
  const get = new GetOwnedPortfolio(repository, openPositions({ [ID(1)]: 6 }));

  it('returns a portfolio of the user with its counts', async () => {
    await expect(get.execute(ANA, ID(1))).resolves.toEqual({
      id: ID(1),
      name: 'Longo prazo',
      operationCount: 11,
      assetCount: 6,
    });
  });

  it('answers not found for a portfolio of another user (RN02)', async () => {
    await expect(get.execute(BRUNO, ID(1))).rejects.toBeInstanceOf(
      PortfolioNotFoundError,
    );
  });

  it('answers not found for a missing portfolio', async () => {
    await expect(get.execute(ANA, ID(9))).rejects.toBeInstanceOf(
      PortfolioNotFoundError,
    );
  });

  it('answers not found for a malformed id without querying', async () => {
    repository.calls.length = 0;

    await expect(get.execute(ANA, 'abc')).rejects.toBeInstanceOf(
      PortfolioNotFoundError,
    );
    expect(repository.calls).toEqual([]);
  });
});

describe('DeletePortfolio (B1, D41, RN02)', () => {
  function repositoryWithAnasPortfolio(): InMemoryPortfolios {
    const repository = new InMemoryPortfolios();
    seed(repository, [
      { id: ID(1), userId: ANA, name: 'Longo prazo', operationCount: 11 },
    ]);
    return repository;
  }

  it('deletes a portfolio of the user', async () => {
    const repository = repositoryWithAnasPortfolio();

    await new DeletePortfolio(repository).execute(ANA, ID(1));

    expect(repository.rows).toHaveLength(0);
  });

  it('does not delete a portfolio of another user and answers not found (RN02)', async () => {
    const repository = repositoryWithAnasPortfolio();

    await expect(
      new DeletePortfolio(repository).execute(BRUNO, ID(1)),
    ).rejects.toBeInstanceOf(PortfolioNotFoundError);
    expect(repository.rows).toHaveLength(1);
    expect(repository.calls).toEqual([`delete:${BRUNO}:${ID(1)}`]);
  });

  it('answers not found for a malformed id without querying', async () => {
    const repository = repositoryWithAnasPortfolio();

    await expect(
      new DeletePortfolio(repository).execute(ANA, 'not-a-uuid'),
    ).rejects.toBeInstanceOf(PortfolioNotFoundError);
    expect(repository.calls).toEqual([]);
  });
});
