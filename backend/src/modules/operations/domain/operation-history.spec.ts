import { InvalidValueError } from '../../../shared/domain/domain-error';
import {
  DEFAULT_HISTORY_PAGE_SIZE,
  historyFilterOf,
  MAX_HISTORY_PAGE,
  MAX_HISTORY_PAGE_SIZE,
} from './operation-history';

const UUID = '6b0d3a52-1f5e-4f0a-9d7c-3e2b8a1c4d90';
const all = {
  assetId: null,
  brokerId: null,
  assetType: null,
  page: 1,
  pageSize: DEFAULT_HISTORY_PAGE_SIZE,
};

describe('historyFilterOf (B5, D45)', () => {
  it('accepts no filter, 50 per page (handoff, frame 6)', () => {
    expect(historyFilterOf(all)).toEqual(all);
    expect(DEFAULT_HISTORY_PAGE_SIZE).toBe(50);
  });

  it.each(['STOCK', 'FII', 'ETF', 'BDR', 'FIXED_INCOME', 'CRYPTO'])(
    'accepts the asset type %s (D45, D50)',
    (assetType) => {
      expect(historyFilterOf({ ...all, assetType }).assetType).toBe(assetType);
    },
  );

  it('accepts uuid filters of asset and broker', () => {
    expect(
      historyFilterOf({ ...all, assetId: UUID, brokerId: UUID }),
    ).toMatchObject({ assetId: UUID, brokerId: UUID });
  });

  it.each([
    ['assetType', { assetType: 'BOND' }],
    ['assetId', { assetId: 'abc' }],
    ['brokerId', { brokerId: 'abc' }],
    ['page', { page: 0 }],
    ['page', { page: MAX_HISTORY_PAGE + 1 }],
    ['page', { page: 1.5 }],
    ['pageSize', { pageSize: MAX_HISTORY_PAGE_SIZE + 1 }],
  ])('rejects an invalid %s with its field', (field, overrides) => {
    expect(() => historyFilterOf({ ...all, ...overrides })).toThrow(
      expect.objectContaining({ field }) as InvalidValueError,
    );
  });
});
