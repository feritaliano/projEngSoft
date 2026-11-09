import type { Prisma } from '../../../generated/prisma/client';
import type { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { InconsistentAssetError } from '../domain/catalog';
import { PrismaAssetCatalog } from './prisma-asset-catalog';
import { PrismaBrokerCatalog } from './prisma-broker-catalog';

const ROW = {
  id: 'a1',
  ticker: null,
  type: 'FIXED_INCOME',
  issuer: 'Tesouro Nacional',
  sector: null,
  crypto_name: null,
  fixed_income_type: 'Tesouro IPCA+',
  maturity_date: new Date('2035-05-15T00:00:00.000Z'),
};

/** The SQL text and the bound values of each $queryRaw call, as Prisma composes them. */
function catalogWith(results: unknown[][]) {
  const queries: { sql: string; values: unknown[] }[] = [];
  const $queryRaw = jest.fn(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      const parts = values.map((value) =>
        value && typeof value === 'object' && 'sql' in value
          ? (value as Prisma.Sql)
          : null,
      );
      const sql = strings.reduce(
        (text, part, index) =>
          text +
          part +
          (index < values.length ? (parts[index]?.sql ?? '$') : ''),
        '',
      );
      const bound = values.flatMap((value, index) =>
        parts[index] ? parts[index].values : [value],
      );
      queries.push({ sql, values: bound });
      return Promise.resolve(results.shift());
    },
  );
  return {
    catalog: new PrismaAssetCatalog({ $queryRaw } as unknown as PrismaService),
    queries,
  };
}

describe('PrismaAssetCatalog (C1, D25)', () => {
  it('pages the active assets and counts them with the same filter', async () => {
    const { catalog, queries } = catalogWith([[ROW], [{ total: 41 }]]);

    const result = await catalog.search({ term: null, page: 3, pageSize: 10 });

    expect(result).toEqual({
      records: [
        {
          id: 'a1',
          ticker: null,
          assetType: 'FIXED_INCOME',
          issuer: 'Tesouro Nacional',
          sector: null,
          cryptoName: null,
          fixedIncomeTypeName: 'Tesouro IPCA+',
          maturityDate: '2035-05-15',
        },
      ],
      total: 41,
    });
    expect(queries[0].sql).toContain('WHERE a.is_active');
    expect(queries[0].sql).not.toContain('LIKE');
    expect(queries[0].values).toEqual([10, 20]);
    expect(queries[1].sql).toContain('count(*)');
  });

  it('searches ticker and issuer name ignoring case and accents, with a bound parameter', async () => {
    const { catalog, queries } = catalogWith([[], [{ total: 0 }]]);

    await catalog.search({ term: 'ItaúSA', page: 1, pageSize: 20 });

    for (const query of queries) {
      expect(query.sql).toContain('unaccent(lower(a.ticker)) LIKE unaccent(');
      expect(query.sql).toContain('unaccent(lower(i.name)) LIKE unaccent(');
      expect(query.sql).not.toContain('itaúsa');
    }
    expect(queries[0].values).toContain('%itaúsa%');
  });

  it('treats %, _ and \\ typed by the user as literal characters', async () => {
    const { catalog, queries } = catalogWith([[], [{ total: 0 }]]);

    await catalog.search({ term: '50%_a\\b', page: 1, pageSize: 20 });

    expect(queries[1].values).toEqual(['%50\\%\\_a\\\\b%', '%50\\%\\_a\\\\b%']);
  });

  it('finds one active asset by exact ticker', async () => {
    const { catalog, queries } = catalogWith([
      [{ ...ROW, ticker: 'PETR4', type: 'STOCK', maturity_date: null }],
      [],
    ]);

    await expect(catalog.findByTicker('PETR4')).resolves.toMatchObject({
      ticker: 'PETR4',
      assetType: 'STOCK',
      maturityDate: null,
    });
    await expect(catalog.findByTicker('XXXX3')).resolves.toBeNull();
    expect(queries[0].sql).toContain('a.ticker =');
    expect(queries[0].values).toEqual(['PETR4']);
  });

  it('fails loudly on an asset type the code does not know', async () => {
    const { catalog } = catalogWith([
      [{ ...ROW, type: 'OPTION' }],
      [{ total: 1 }],
    ]);

    await expect(
      catalog.search({ term: null, page: 1, pageSize: 20 }),
    ).rejects.toBeInstanceOf(InconsistentAssetError);
  });
});

describe('PrismaBrokerCatalog (RN04)', () => {
  it('lists the brokers by name', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'b1', name: 'Binance', cnpj: null }]);

    await expect(
      new PrismaBrokerCatalog({
        broker: { findMany },
      } as unknown as PrismaService).list(),
    ).resolves.toEqual([{ id: 'b1', name: 'Binance', cnpj: null }]);
    expect(findMany.mock.calls[0][0]).toMatchObject({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  });
});
