import {
  AssetCatalog,
  AssetNotFoundError,
  AssetRecord,
  AssetSearch,
  Broker,
  BrokerCatalog,
  DEFAULT_PAGE_SIZE,
} from '../domain/catalog';
import { GetAsset } from './get-asset.use-case';
import { ListBrokers } from './list-brokers.use-case';
import { SearchAssets } from './search-assets.use-case';

const ITSA4: AssetRecord = {
  id: 'a1',
  ticker: 'ITSA4',
  assetType: 'STOCK',
  issuer: 'Itaúsa S.A.',
  sector: 'Financeiro',
  cryptoName: null,
  fixedIncomeTypeName: null,
  maturityDate: null,
};

class FakeCatalog extends AssetCatalog {
  readonly searches: AssetSearch[] = [];
  readonly tickers: string[] = [];

  search(search: AssetSearch) {
    this.searches.push(search);
    return Promise.resolve({ records: [ITSA4], total: 41 });
  }

  findByTicker(ticker: string): Promise<AssetRecord | null> {
    this.tickers.push(ticker);
    return Promise.resolve(ticker === 'ITSA4' ? ITSA4 : null);
  }

  findActiveById(): Promise<AssetRecord | null> {
    return Promise.reject(new Error('not used'));
  }

  findByIds(): Promise<AssetRecord[]> {
    return Promise.reject(new Error('not used'));
  }
}

describe('SearchAssets (C1)', () => {
  it('passes the trimmed term and the page, and returns items with total', async () => {
    const catalog = new FakeCatalog();

    const page = await new SearchAssets(catalog).execute({
      search: '  itausa ',
      page: 3,
      pageSize: 10,
    });

    expect(catalog.searches).toEqual([
      { term: 'itausa', page: 3, pageSize: 10 },
    ]);
    expect(page).toEqual({
      items: [
        {
          id: 'a1',
          ticker: 'ITSA4',
          assetType: 'STOCK',
          displayName: 'ITSA4',
          issuer: 'Itaúsa S.A.',
          sector: 'Financeiro',
        },
      ],
      total: 41,
    });
  });

  it.each([
    ['no search', {}],
    ['a blank search', { search: '   ' }],
  ])(
    'lists the whole catalog on %s, first page by default',
    async (_case, query) => {
      const catalog = new FakeCatalog();

      await new SearchAssets(catalog).execute(query);

      expect(catalog.searches).toEqual([
        { term: null, page: 1, pageSize: DEFAULT_PAGE_SIZE },
      ]);
    },
  );
});

describe('GetAsset (C1)', () => {
  it('finds the ticker in any casing (tickers are stored upper case, RN03)', async () => {
    const catalog = new FakeCatalog();

    await expect(
      new GetAsset(catalog).execute(' itsa4 '),
    ).resolves.toMatchObject({
      ticker: 'ITSA4',
    });
    expect(catalog.tickers).toEqual(['ITSA4']);
  });

  it('answers not found for a value that cannot be a ticker, without querying', async () => {
    const catalog = new FakeCatalog();

    await expect(
      new GetAsset(catalog).execute('PETR\u0000'),
    ).rejects.toBeInstanceOf(AssetNotFoundError);
    expect(catalog.tickers).toEqual([]);
  });

  it('answers AssetNotFoundError for an unknown ticker', async () => {
    await expect(
      new GetAsset(new FakeCatalog()).execute('XXXX3'),
    ).rejects.toBeInstanceOf(AssetNotFoundError);
  });
});

describe('ListBrokers (RN04, D9)', () => {
  it('returns the brokers of the catalog, CNPJ null for an exchange (D50)', async () => {
    const brokers: Broker[] = [
      { id: 'b1', name: 'Binance', cnpj: null },
      { id: 'b2', name: 'XP Investimentos', cnpj: '02332886000104' },
    ];
    const catalog = new (class extends BrokerCatalog {
      list() {
        return Promise.resolve(brokers);
      }

      findByIds() {
        return Promise.reject(new Error('not used'));
      }
    })();

    await expect(new ListBrokers(catalog).execute()).resolves.toBe(brokers);
  });
});
