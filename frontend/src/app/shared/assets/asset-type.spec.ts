import { ASSET_TYPE as API_ASSET_TYPES } from '../../api/models/asset-type-array';
import { CHIP_ORDER, GROUP_ORDER, assetName } from './asset-type';

describe('asset classes (D45, D55)', () => {
  // A class missing here would hide its positions in the Detail and its chip in the History.
  it('orders every class of the API exactly once, in the Detail groups and in the History chips', () => {
    const api = [...API_ASSET_TYPES].sort();

    expect([...GROUP_ORDER].sort()).toEqual(api);
    expect([...CHIP_ORDER].sort()).toEqual(api);
  });

  it('names the asset by the ticker, or by the display name without one (D50)', () => {
    expect(assetName({ ticker: 'PETR4', displayName: 'PETR4' })).toBe('PETR4');
    expect(assetName({ ticker: null, displayName: 'Tesouro IPCA+ 2035' })).toBe(
      'Tesouro IPCA+ 2035',
    );
  });
});
