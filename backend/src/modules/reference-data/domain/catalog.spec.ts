import { InvalidValueError } from '../../../shared/domain/domain-error';
import {
  AssetRecord,
  assetSearchOf,
  isTicker,
  MAX_PAGE,
  MAX_PAGE_SIZE,
  displayNameOf,
  InconsistentAssetError,
  toAssetSummary,
} from './catalog';

const base: AssetRecord = {
  id: 'a1',
  ticker: 'PETR4',
  assetType: 'STOCK',
  issuer: 'Petróleo Brasileiro S.A.',
  sector: 'Petróleo, Gás e Biocombustíveis',
  cryptoName: null,
  fixedIncomeTypeName: null,
  maturityDate: null,
};

describe('displayNameOf (D50)', () => {
  it.each(['STOCK', 'FII', 'ETF', 'BDR'] as const)(
    'shows the ticker of a %s',
    (assetType) => {
      expect(displayNameOf({ ...base, assetType })).toBe('PETR4');
    },
  );

  it('shows the name of a crypto asset', () => {
    expect(
      displayNameOf({
        ...base,
        assetType: 'CRYPTO',
        ticker: 'BTC',
        issuer: null,
        sector: null,
        cryptoName: 'Bitcoin',
      }),
    ).toBe('Bitcoin');
  });

  it('shows the bond type and the maturity year of fixed income', () => {
    expect(
      displayNameOf({
        ...base,
        assetType: 'FIXED_INCOME',
        ticker: null,
        issuer: 'Tesouro Nacional',
        fixedIncomeTypeName: 'Tesouro IPCA+',
        maturityDate: '2035-05-15',
      }),
    ).toBe('Tesouro IPCA+ 2035');
  });

  it.each([
    ['a stock without ticker', { assetType: 'STOCK', ticker: null }],
    [
      'a crypto asset without its row',
      { assetType: 'CRYPTO', cryptoName: null },
    ],
    [
      'fixed income without its bond type',
      { assetType: 'FIXED_INCOME', ticker: null, maturityDate: '2035-05-15' },
    ],
    [
      'fixed income without its maturity',
      {
        assetType: 'FIXED_INCOME',
        ticker: null,
        fixedIncomeTypeName: 'Tesouro IPCA+',
      },
    ],
  ] as const)(
    'fails loudly on %s (data fault, not a guess)',
    (_case, changes) => {
      expect(() => displayNameOf({ ...base, ...changes })).toThrow(
        InconsistentAssetError,
      );
    },
  );
});

describe('assetSearchOf (C1, documented limits)', () => {
  it('accepts the limits', () => {
    expect(assetSearchOf('itsa', MAX_PAGE, MAX_PAGE_SIZE)).toEqual({
      term: 'itsa',
      page: MAX_PAGE,
      pageSize: MAX_PAGE_SIZE,
    });
    expect(assetSearchOf(null, 1, 1)).toEqual({
      term: null,
      page: 1,
      pageSize: 1,
    });
  });

  it.each([
    ['page 0', 0, 20, 'page'],
    ['a fractional page', 1.5, 20, 'page'],
    ['a page above the limit', MAX_PAGE + 1, 20, 'page'],
    ['pageSize 0', 1, 0, 'pageSize'],
    ['a fractional pageSize', 1, 2.5, 'pageSize'],
    ['a pageSize above the limit', 1, MAX_PAGE_SIZE + 1, 'pageSize'],
  ])('rejects %s naming the field', (_case, page, pageSize, field) => {
    expect(() => assetSearchOf(null, page, pageSize)).toThrow(
      InvalidValueError,
    );
    try {
      assetSearchOf(null, page, pageSize);
    } catch (error) {
      expect((error as InvalidValueError).field).toBe(field);
    }
  });
});

describe('assetSearchOf with control characters (C1)', () => {
  it('rejects them in the term, naming the field "search"', () => {
    expect(() => assetSearchOf('itsa\u0000', 1, 20)).toThrow(
      new InvalidValueError('search', 'must not contain control characters'),
    );
  });
});

describe('isTicker (RN03)', () => {
  it.each([
    ['PETR4', true],
    ['BOVA11', true],
    ['BTC', true],
    ['petr4', false],
    ['PETR\u0000', false],
    ['A', false],
    ['ABCDEFGHIJKLM', false],
  ])('%s → %s', (value, expected) => {
    expect(isTicker(value)).toBe(expected);
  });
});

describe('toAssetSummary (C1)', () => {
  it('exposes the catalog fields and the derived display name only', () => {
    expect(toAssetSummary(base)).toEqual({
      id: 'a1',
      ticker: 'PETR4',
      assetType: 'STOCK',
      displayName: 'PETR4',
      issuer: 'Petróleo Brasileiro S.A.',
      sector: 'Petróleo, Gás e Biocombustíveis',
    });
  });
});
