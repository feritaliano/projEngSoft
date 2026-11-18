import { TestBed } from '@angular/core/testing';
import { AssetRef } from '../../api/models';
import { AssetAvatar } from './asset-avatar';

describe('AssetAvatar (D45)', () => {
  const render = async (asset: Omit<AssetRef, 'id'>) => {
    const fixture = TestBed.createComponent(AssetAvatar);
    fixture.componentRef.setInput('asset', asset);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows the first two letters of the ticker with the border of the class, hidden from screen readers', async () => {
    const element = await render({ ticker: 'MXRF11', displayName: 'MXRF11', assetType: 'FII' });

    expect(element.textContent?.trim()).toBe('MX');
    expect(element.classList).toContain('border-chart-2');
    expect(element.getAttribute('aria-hidden')).toBe('true');
  });

  it('uses the display name when the asset has no ticker (fixed income, D50)', async () => {
    const element = await render({
      ticker: null,
      displayName: 'Tesouro IPCA+ 2035',
      assetType: 'FIXED_INCOME',
    });

    expect(element.textContent?.trim()).toBe('TE');
    expect(element.classList).toContain('border-chart-5');
  });
});
