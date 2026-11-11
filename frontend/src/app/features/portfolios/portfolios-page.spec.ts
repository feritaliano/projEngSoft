import { TestBed } from '@angular/core/testing';
import { PortfoliosPage } from './portfolios-page';

describe('PortfoliosPage', () => {
  it('shows the page title', async () => {
    const fixture = TestBed.createComponent(PortfoliosPage);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('Suas carteiras');
  });
});
