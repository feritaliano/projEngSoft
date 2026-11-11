import { TestBed } from '@angular/core/testing';
import { AssetsPage } from './assets-page';

describe('AssetsPage', () => {
  it('shows the page title', async () => {
    const fixture = TestBed.createComponent(AssetsPage);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('Ativos');
  });
});
