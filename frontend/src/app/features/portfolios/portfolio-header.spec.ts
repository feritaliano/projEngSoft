import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { PortfolioDto } from '../../api/models';
import { PortfolioHeader } from './portfolio-header';

const LONGO: PortfolioDto = {
  id: 'p1',
  name: 'Longo prazo',
  operationCount: 11,
  assetCount: 6,
  lastTradeDate: '2026-10-28',
};
const portfolio = signal<PortfolioDto | null>(LONGO);

@Component({
  imports: [PortfolioHeader],
  template: `<app-portfolio-header [portfolio]="portfolio()" subtitle="11 operações · 6 ativos" />`,
})
class Host {
  protected readonly portfolio = portfolio;
}

describe('PortfolioHeader (D45)', () => {
  const open = async (url: string) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'carteiras/:id', component: Host },
          { path: 'carteiras/:id/historico', component: Host },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create(url);
    return harness;
  };

  beforeEach(() => portfolio.set(LONGO));

  it('shows the name, the line below it and the tabs as links, the current one with aria-current (U5)', async () => {
    const harness = await open('/carteiras/p1/historico');
    const element = harness.routeNativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Longo prazo');
    expect(element.textContent).toContain('11 operações · 6 ativos');
    const tabs = [...element.querySelectorAll('nav[aria-label="Seções da carteira"] a')];
    expect(tabs.map((a) => a.textContent?.trim())).toEqual(['Resumo', 'Histórico']);
    expect(tabs.map((a) => a.getAttribute('href'))).toEqual([
      '/carteiras/p1',
      '/carteiras/p1/historico',
    ]);
    expect(tabs.map((a) => a.getAttribute('aria-current'))).toEqual([null, 'page']);
    expect(element.querySelector('[role="tablist"]')).toBeNull();
  });

  it('marks Resumo only on the exact route of the portfolio', async () => {
    const harness = await open('/carteiras/p1');
    const tabs = [
      ...(harness.routeNativeElement as HTMLElement).querySelectorAll(
        'nav[aria-label="Seções da carteira"] a',
      ),
    ];

    expect(tabs.map((a) => a.getAttribute('aria-current'))).toEqual(['page', null]);
  });

  it('without the portfolio shows only the link to the list (U7a)', async () => {
    portfolio.set(null);
    const harness = await open('/carteiras/p1');
    const element = harness.routeNativeElement as HTMLElement;

    expect(element.querySelector('a')?.textContent?.trim()).toBe('Carteiras');
    expect(element.querySelector('h1')).toBeNull();
    expect(element.querySelector('nav[aria-label="Seções da carteira"]')).toBeNull();
  });
});
