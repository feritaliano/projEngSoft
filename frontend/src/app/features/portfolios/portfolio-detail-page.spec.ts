import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../api/api-configuration';
import {
  AssetType,
  DerivedValue,
  PortfolioDto,
  PortfolioSummary,
  Position,
} from '../../api/models';
import { text } from '../../../testing/text';
import { SKELETON_DELAY_MS } from '../../shared/ui/load-error';
import { PortfolioDetailPage, detailSubtitle } from './portfolio-detail-page';

const API = 'http://api.test';
const URL = `${API}/api/v1/portfolios/p1`;

const derived = (value: string): DerivedValue => ({
  value,
  formulaCode: 'TOTAL_COST',
  asOf: '2026-11-17',
  inputs: [],
});
const position = (
  ticker: string | null,
  displayName: string,
  assetType: AssetType,
  quantity: string,
  averagePrice: string | null,
  totalCost: string | null,
  realizedProfit: string,
): Position => ({
  asset: { id: displayName, ticker, displayName, assetType },
  status: quantity === '0' ? 'CLOSED' : 'OPEN',
  quantity,
  averagePrice: averagePrice === null ? null : derived(averagePrice),
  totalCost: totalCost === null ? null : derived(totalCost),
  realizedProfit: derived(realizedProfit),
});

// Seed of the demo user (handoff, "Massa das telas 3 e 4"), in the order of the API (by class, then name).
const LONGO: PortfolioDto = {
  id: 'p1',
  name: 'Longo prazo',
  operationCount: 11,
  assetCount: 6,
  lastTradeDate: '2026-10-28',
};
const SUMMARY: PortfolioSummary = {
  totalCost: derived('16151.27'),
  realizedProfit: derived('693.87'),
  assetCount: 6,
};
const POSITIONS: Position[] = [
  position('ITSA4', 'ITSA4', 'STOCK', '300', '9.87', '2961', '0'),
  position('PETR4', 'PETR4', 'STOCK', '100', '32.0326666666666666667', '3203.27', '293.47'),
  position('WEGE3', 'WEGE3', 'STOCK', '0', null, null, '412.8'),
  position('MXRF11', 'MXRF11', 'FII', '150', '10.12', '1518', '-12.4'),
  position('BOVA11', 'BOVA11', 'ETF', '20', '118.45', '2369', '0'),
  position(null, 'Tesouro IPCA+ 2035', 'FIXED_INCOME', '0.52', '3846.15384615', '2000', '0'),
  position('BTC', 'Bitcoin', 'CRYPTO', '0.0125', '328000', '4100', '0'),
];

describe('PortfolioDetailPage (frame 4, B6, B7)', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let handleError: ReturnType<typeof vi.fn>;

  const open = async () => {
    harness = await RouterTestingHarness.create('/carteiras/p1');
    return harness.routeNativeElement as HTMLElement;
  };
  const answer = async (
    portfolio: PortfolioDto | number = LONGO,
    summary: PortfolioSummary | number = SUMMARY,
    positions: Position[] | number = POSITIONS,
  ) => {
    const flush = (url: string, body: object | number) => {
      const request = http.expectOne({ method: 'GET', url });
      // forkJoin cancels the other calls when one fails.
      if (request.cancelled) return;
      if (typeof body === 'number')
        request.flush({ status: body }, { status: body, statusText: 'Error' });
      else request.flush(body);
    };
    flush(URL, portfolio);
    flush(`${URL}/summary`, summary);
    flush(`${URL}/positions`, positions);
    await harness.fixture.whenStable();
    return harness.routeNativeElement as HTMLElement;
  };

  beforeEach(() => {
    handleError = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(API),
        provideRouter([
          { path: 'carteiras/:id', component: PortfolioDetailPage },
          { path: 'carteiras/:id/historico', children: [] },
        ]),
        { provide: ErrorHandler, useValue: { handleError } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows the totals of the API formatted in pt-BR, with the sign of the realized profit (B7, RN11)', async () => {
    await open();
    const element = await answer();

    expect(text(element.querySelector('h1'))).toBe('Longo prazo');
    expect(element.textContent).toContain('11 operações · 6 ativos');
    const kpis = [...element.querySelector('dl')!.children].map(text);
    expect(kpis).toEqual([
      'Custo total R$ 16.151,27',
      'Lucro realizado + R$ 693,87',
      'Ativos em carteira 6 1 posição encerrada',
    ]);
    expect(element.querySelector('dl > div:nth-child(2) dd')?.className).toContain('text-positive');
  });

  it('groups the open positions by class in the order of the frame, with the quantity of each class', async () => {
    await open();
    const element = await answer();
    const table = element.querySelector('table');

    expect([...table!.querySelectorAll('th[scope="rowgroup"]')].map(text)).toEqual([
      'Ações',
      'ETFs',
      'FIIs',
      'Renda fixa',
      'Cripto',
    ]);
    const rows = [...table!.querySelectorAll('tbody tr:not(:first-child)')].map(text);
    expect(rows).toEqual([
      'IT ITSA4 Ação 300 R$ 9,87 R$ 2.961,00 R$ 0,00',
      'PE PETR4 Ação 100 R$ 32,03 R$ 3.203,27 + R$ 293,47',
      'BO BOVA11 ETF 20 R$ 118,45 R$ 2.369,00 R$ 0,00',
      'MX MXRF11 FII 150 R$ 10,12 R$ 1.518,00 − R$ 12,40',
      'TE Tesouro IPCA+ 2035 Renda fixa 0,52 R$ 3.846,15 R$ 2.000,00 R$ 0,00',
      'BT BTC Cripto 0,0125 R$ 328.000,00 R$ 4.100,00 R$ 0,00',
    ]);
    expect(text(table!.querySelector('tfoot'))).toBe('Total R$ 16.151,27');
    expect(element.querySelector('app-asset-avatar')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('colors the realized profit by its sign: loss negative, zero neutral (handoff U5)', async () => {
    await open();
    const element = await answer(LONGO, { ...SUMMARY, realizedProfit: derived('-12.4') });
    const profitOf = (name: string) =>
      [...element.querySelectorAll('table tbody tr')]
        .find((row) => row.textContent?.includes(name))!
        .querySelector('td:last-child')!.className;

    expect(profitOf('MXRF11')).toContain('text-negative');
    expect(profitOf('ITSA4')).toContain('text-primary');
    expect(profitOf('PETR4')).toContain('text-positive');
    const kpi = element.querySelector('dl > div:nth-child(2) dd')!;
    expect(text(kpi)).toBe('− R$ 12,40');
    expect(kpi.className).toContain('text-negative');
  });

  it('shows the same values in the mobile cards, grouped by class with the count (handoff U5)', async () => {
    await open();
    const element = await answer();
    const stocks = element.querySelector('section[aria-label="Ações"]')!;

    expect(text(stocks.querySelector('p'))).toBe('Ações · 2 ativos');
    expect(text(stocks.querySelector('li:nth-child(2)'))).toBe(
      'PE PETR4 Ação Quantidade 100 Preço médio R$ 32,03 Custo total R$ 3.203,27 Lucro realizado + R$ 293,47',
    );
  });

  it('keeps the closed positions collapsed until "Mostrar", with "—" for average price and cost (RN08, D41)', async () => {
    await open();
    const element = await answer();
    const toggle = [...element.querySelectorAll('button')].find((b) => text(b) === 'Mostrar')!;
    const region = element.querySelector<HTMLElement>('#closed-positions')!;

    expect(text(element.querySelector('#closed-title'))).toBe('Posições encerradas (1)');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(region.hidden).toBe(true);

    toggle.click();
    await harness.fixture.whenStable();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(text(toggle)).toBe('Recolher');
    expect(region.hidden).toBe(false);
    expect(text(region.querySelector('tbody tr'))).toBe('WE WEGE3 Ação 0 — — + R$ 412,80');
  });

  it('shows the empty state of a portfolio without operations', async () => {
    await open();
    const element = await answer(
      { ...LONGO, name: 'Testes FII', operationCount: 0, assetCount: 0, lastTradeDate: null },
      { totalCost: derived('0'), realizedProfit: derived('0'), assetCount: 0 },
      [],
    );

    expect(element.textContent).toContain('Nenhuma operação ainda');
    expect(element.textContent).toContain('Esta carteira ainda não tem operações');
    expect(text(element.querySelector('dl > div:nth-child(3)'))).toBe(
      'Ativos em carteira 0 Nenhuma posição',
    );
    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('#closed-title')).toBeNull();
  });

  it('shows the 404 page for a portfolio that does not exist or belongs to another user (RN02)', async () => {
    await open();
    const element = await answer(404);

    expect(text(element.querySelector('h1'))).toBe('Página não encontrada');
  });

  it('shows the whole error without the name when any call fails, and loads again on "Tentar de novo" (U7a)', async () => {
    await open();
    const element = await answer(LONGO, 500);

    expect(text(element.querySelector('[role="alert"] h2'))).toBe(
      'Não conseguimos carregar esta carteira',
    );
    expect(element.querySelector('h1')).toBeNull();

    expect(handleError).not.toHaveBeenCalled();

    element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    await harness.fixture.whenStable();
    expect(document.activeElement?.id).toBe('detail-loading');

    // The loading region goes away with the answer: the focus moves on to the title (U7a).
    await answer();
    expect(text(element.querySelector('h1'))).toBe('Longo prazo');
    expect(document.activeElement?.tagName).toBe('H1');
  });

  it('also reports an answer the front did not expect (400), a bug of the front', async () => {
    await open();
    const element = await answer(LONGO, 400);

    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(handleError).toHaveBeenCalledTimes(1);
  });

  it('shows the skeleton only after 300 ms without an answer (U5)', async () => {
    const element = await open();
    expect(element.textContent).not.toContain('Calculando posições');

    await new Promise((resolve) => setTimeout(resolve, SKELETON_DELAY_MS + 20));
    harness.detectChanges();
    expect(element.textContent).toContain('Calculando posições a partir das suas operações…');
    expect(element.querySelector('[aria-busy="true"]')).not.toBeNull();

    await answer();
  });
});

describe('detailSubtitle (microcopy, section 11)', () => {
  it('counts operations and open positions, in the singular too', () => {
    expect(detailSubtitle({ ...LONGO, operationCount: 1, assetCount: 1 })).toBe(
      '1 operação · 1 ativo',
    );
    expect(detailSubtitle({ ...LONGO, operationCount: 3, assetCount: 0 })).toBe(
      '3 operações · nenhuma posição aberta',
    );
    expect(detailSubtitle({ ...LONGO, operationCount: 0, assetCount: 0 })).toBe(
      'Nenhuma operação ainda',
    );
  });
});
