import { ASSET_TYPE as API_ASSET_TYPES } from '../../api/models/asset-type-array';
import { CHIP_ORDER, assetName } from './asset-type';

describe('asset classes (D45, D55)', () => {
  // A class missing here would hide its chip in the History.
  it('orders every class of the API exactly once in the History chips', () => {
    expect([...CHIP_ORDER].sort()).toEqual([...API_ASSET_TYPES].sort());
  });

  it('names the asset by the ticker, or by the display name without one (D50)', () => {
    expect(assetName({ ticker: 'PETR4', displayName: 'PETR4' })).toBe('PETR4');
    expect(assetName({ ticker: null, displayName: 'Tesouro IPCA+ 2035' })).toBe(
      'Tesouro IPCA+ 2035',
    );
  });
});
