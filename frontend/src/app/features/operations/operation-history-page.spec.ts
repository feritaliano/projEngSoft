import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { text } from '../../../testing/text';
import { provideApiConfiguration } from '../../api/api-configuration';
import { AssetRef, BrokerDto, OperationDto, PortfolioDto, Position } from '../../api/models';
import { SKELETON_DELAY_MS } from '../../shared/ui/load-error';
import { OperationHistoryPage, historySubtitle, noResultTitle } from './operation-history-page';

const API = 'http://api.test';
const PORTFOLIO_URL = `${API}/api/v1/portfolios/p1`;
const OPERATIONS_URL = `${PORTFOLIO_URL}/operations`;

const LONGO: PortfolioDto = {
  id: 'p1',
  name: 'Longo prazo',
  operationCount: 11,
  assetCount: 6,
  lastTradeDate: '2026-10-28',
};
const asset = (
  id: string,
  ticker: string | null,
  displayName: string,
  assetType: AssetRef['assetType'],
): AssetRef => ({ id, ticker, displayName, assetType });
const BOVA = asset('a-bova', 'BOVA11', 'BOVA11', 'ETF');
const MXRF = asset('a-mxrf', 'MXRF11', 'MXRF11', 'FII');
const TESOURO = asset('a-tesouro', null, 'Tesouro IPCA+ 2035', 'FIXED_INCOME');
const BTC = asset('a-btc', 'BTC', 'Bitcoin', 'CRYPTO');
const XP: BrokerDto = { id: 'b-xp', name: 'XP Investimentos', cnpj: '02332886000104' };
const RICO: BrokerDto = { id: 'b-rico', name: 'Rico', cnpj: null };

const operation = (
  id: string,
  type: OperationDto['type'],
  tradeDate: string,
  operationAsset: AssetRef,
  broker: BrokerDto,
  quantity: string,
  unitPrice: string,
  fees: string,
): OperationDto => ({
  id,
  type,
  tradeDate,
  asset: operationAsset,
  broker: { id: broker.id, name: broker.name },
  quantity,
  unitPrice,
  fees,
});
const OPERATIONS = [
  operation('o11', 'BUY', '2026-10-28', BOVA, RICO, '20', '118.3', '3'),
  operation('o10', 'BUY', '2026-07-29', BTC, XP, '0.0125', '328000', '0'),
  operation('o8', 'SELL', '2026-05-22', MXRF, XP, '50', '9.88', '0.4'),
  operation('o6', 'BUY', '2026-03-02', TESOURO, XP, '0.52', '3846.15384615', '0'),
];
const positionOf = (positionAsset: AssetRef) => ({ asset: positionAsset }) as Position;

describe('OperationHistoryPage (frame 6, B5, D45)', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let element: HTMLElement;

  const operations = () => http.expectOne((r) => r.url === OPERATIONS_URL);
  const settle = async () => {
    await harness.fixture.whenStable();
    return element;
  };
  const open = async (portfolio: PortfolioDto = LONGO, page = OPERATIONS, total = 11) => {
    harness = await RouterTestingHarness.create('/carteiras/p1/historico');
    element = harness.routeNativeElement as HTMLElement;
    http.expectOne(PORTFOLIO_URL).flush(portfolio);
    http.expectOne(`${PORTFOLIO_URL}/positions`).flush([BTC, BOVA, MXRF, TESOURO].map(positionOf));
    http.expectOne(`${API}/api/v1/brokers`).flush([RICO, XP]);
    const first = operations();
    first.flush({ items: page, total });
    await settle();
    return first;
  };
  const button = (label: string) =>
    [...element.querySelectorAll('button')].find((b) => text(b) === label)!;
  const select = async (id: string, value: string) => {
    const field = element.querySelector<HTMLSelectElement>(id)!;
    field.value = value;
    field.dispatchEvent(new Event('change'));
    await settle();
  };
  const fail = (request: TestRequest, status: number) =>
    request.flush({ status }, { status, statusText: 'Error' });
  /** forkJoin cancels the other calls when one fails; the testing backend still lists them. */
  const dropCancelled = () =>
    expect(http.match(() => true).every((request) => request.cancelled)).toBe(true);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(API),
        provideRouter([
          { path: 'carteiras/:id', children: [] },
          { path: 'carteiras/:id/historico', component: OperationHistoryPage },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the operations most recent first, formatted by class, with the header and 7 fixed chips', async () => {
    const first = await open();

    expect(first.request.params.get('page')).toBe('1');
    expect(first.request.params.has('assetType')).toBe(false);
    expect(element.textContent).toContain('11 operações · última em 28/10/2026');
    expect(
      [...element.querySelectorAll('nav[aria-label="Seções da carteira"] a')].map((a) =>
        a.getAttribute('aria-current'),
      ),
    ).toEqual([null, 'page']);
    expect([...element.querySelectorAll('table tbody tr')].map(text)).toEqual([
      '28/10/2026 Compra BO BOVA11 Rico 20 R$ 118,30 R$ 3,00',
      '29/07/2026 Compra BT BTC XP Investimentos 0,0125 R$ 328.000,00 R$ 0,00',
      '22/05/2026 Venda MX MXRF11 XP Investimentos 50 R$ 9,88 R$ 0,40',
      '02/03/2026 Compra TE Tesouro IPCA+ 2035 XP Investimentos 0,52 R$ 3.846,15 R$ 0,00',
    ]);
    expect(text(element.querySelector('[aria-live="polite"]'))).toBe('11 operações');
    const chips = [...element.querySelectorAll('[role="group"] button')];
    expect(chips.map(text)).toEqual([
      'Todos',
      'Ações',
      'FIIs',
      'ETFs',
      'BDRs',
      'Renda fixa',
      'Cripto',
    ]);
    expect(chips.map((c) => c.getAttribute('aria-pressed'))).toEqual([
      'true',
      ...Array(6).fill('false'),
    ]);
    expect(
      [...element.querySelectorAll('#filter-asset option')].map((o) => o.textContent?.trim()),
    ).toEqual(['Todos', 'BOVA11', 'BTC', 'MXRF11', 'Tesouro IPCA+ 2035']);
    expect(button('Limpar filtros')).toBeUndefined();
  });

  it('filters by asset class on the backend and counts against all the operations (D45)', async () => {
    await open();

    button('FIIs').click();
    await settle();
    const request = operations();
    expect(request.request.params.get('assetType')).toBe('FII');
    expect(text(element.querySelector('[aria-live="polite"]'))).toBe('Carregando operações…');
    request.flush({ items: [OPERATIONS[2]], total: 2 });
    await settle();

    expect(button('FIIs').getAttribute('aria-pressed')).toBe('true');
    expect(button('Todos').getAttribute('aria-pressed')).toBe('false');
    expect(text(element.querySelector('[aria-live="polite"]'))).toBe('2 de 11 operações');
    expect(element.querySelectorAll('table tbody tr')).toHaveLength(1);
  });

  it('shows "filtro sem resultado" for a chip without operations and clears the filters', async () => {
    await open();

    button('BDRs').click();
    await settle();
    operations().flush({ items: [], total: 0 });
    await settle();
    expect(text(element.querySelector('section h2'))).toBe(
      'Nenhuma operação de BDRs nesta carteira',
    );

    [...element.querySelectorAll('button')]
      .filter((b) => text(b) === 'Limpar filtros')
      .at(-1)!
      .click();
    await settle();
    const request = operations();
    expect(request.request.params.has('assetType')).toBe(false);
    request.flush({ items: OPERATIONS, total: 11 });
    await settle();
    expect(document.activeElement?.id).toBe('filter-asset');
    expect(element.querySelectorAll('table tbody tr')).toHaveLength(4);
  });

  it('filters by asset and broker and names both when nothing matches', async () => {
    await open();

    await select('#filter-asset', BOVA.id);
    operations().flush({ items: [OPERATIONS[0]], total: 1 });
    await settle();
    await select('#filter-broker', XP.id);
    const request = operations();
    expect(request.request.params.get('assetId')).toBe(BOVA.id);
    expect(request.request.params.get('brokerId')).toBe(XP.id);
    request.flush({ items: [], total: 0 });
    await settle();

    expect(text(element.querySelector('section h2'))).toBe(
      'Nenhuma operação de BOVA11 na XP Investimentos',
    );
    expect(text(element.querySelector('[aria-live="polite"]'))).toBe('0 de 11 operações');
  });

  it('loads the next 50 with "Carregar mais", keeping the filters', async () => {
    await open(LONGO, OPERATIONS.slice(0, 2), 3);

    button('Carregar mais').click();
    await settle();
    const request = operations();
    expect(request.request.params.get('page')).toBe('2');
    expect(button('Carregar mais').disabled).toBe(true);
    request.flush({ items: [OPERATIONS[2]], total: 3 });
    await settle();

    expect(element.querySelectorAll('table tbody tr')).toHaveLength(3);
    expect(button('Carregar mais')).toBeUndefined();
  });

  it('shows the empty state of a portfolio without operations, without filters', async () => {
    await open({ ...LONGO, operationCount: 0, assetCount: 0, lastTradeDate: null }, [], 0);

    expect(element.textContent).toContain('Nenhuma operação ainda');
    expect(text(element.querySelector('section h2'))).toBe('Nenhuma operação nesta carteira');
    expect(element.querySelector('[role="group"]')).toBeNull();
    expect(element.querySelector('#filter-asset')).toBeNull();
  });

  it('keeps the header and replaces filters and list by the error card, then loads again (U7a)', async () => {
    await open();

    button('Ações').click();
    await settle();
    fail(operations(), 500);
    await settle();
    expect(text(element.querySelector('[role="alert"] h2'))).toBe(
      'Não conseguimos carregar as operações',
    );
    expect(text(element.querySelector('h1'))).toBe('Longo prazo');
    expect(element.querySelector('#filter-asset')).toBeNull();

    button('Tentar de novo').click();
    await settle();
    expect(document.activeElement?.tagName).toBe('H1');
    const request = operations();
    expect(request.request.params.get('assetType')).toBe('STOCK');
    request.flush({ items: [], total: 0 });
  });

  it('without the header, the error card and "Tentar de novo" load everything again', async () => {
    harness = await RouterTestingHarness.create('/carteiras/p1/historico');
    element = harness.routeNativeElement as HTMLElement;
    fail(http.expectOne(PORTFOLIO_URL), 503);
    dropCancelled();
    await settle();
    expect(element.querySelector('h1')).toBeNull();

    button('Tentar de novo').click();
    await settle();
    expect(document.activeElement?.id).toBe('history-loading');
    http.expectOne(PORTFOLIO_URL).flush(LONGO);
    http.expectOne(`${PORTFOLIO_URL}/positions`).flush([]);
    http.expectOne(`${API}/api/v1/brokers`).flush([]);
    operations().flush({ items: OPERATIONS, total: 11 });
    await settle();
    expect(text(element.querySelector('h1'))).toBe('Longo prazo');
  });

  it('shows the 404 page for a portfolio of another user (RN02)', async () => {
    harness = await RouterTestingHarness.create('/carteiras/p1/historico');
    element = harness.routeNativeElement as HTMLElement;
    fail(http.expectOne(PORTFOLIO_URL), 404);
    dropCancelled();
    await settle();

    expect(text(element.querySelector('h1'))).toBe('Página não encontrada');
  });

  it('shows the skeleton only after 300 ms without an answer (U5)', async () => {
    harness = await RouterTestingHarness.create('/carteiras/p1/historico');
    element = harness.routeNativeElement as HTMLElement;
    expect(element.textContent).not.toContain('Carregando operações…');

    await new Promise((resolve) => setTimeout(resolve, SKELETON_DELAY_MS + 20));
    harness.detectChanges();
    expect(element.textContent).toContain('Carregando operações…');

    http.expectOne(PORTFOLIO_URL).flush(LONGO);
    http.expectOne(`${PORTFOLIO_URL}/positions`).flush([]);
    http.expectOne(`${API}/api/v1/brokers`).flush([]);
    operations().flush({ items: [], total: 0 });
  });
});

describe('History texts (microcopy, section 11)', () => {
  it('counts the operations and the date of the last one', () => {
    expect(historySubtitle({ ...LONGO, operationCount: 1 })).toBe(
      '1 operação · última em 28/10/2026',
    );
    expect(historySubtitle({ ...LONGO, operationCount: 0, lastTradeDate: null })).toBe(
      'Nenhuma operação ainda',
    );
  });

  it('names the filter that found nothing', () => {
    const none = { assetId: '', brokerId: '', assetType: null };
    expect(noResultTitle({ ...none, assetType: 'FIXED_INCOME' }, undefined, undefined)).toBe(
      'Nenhuma operação de renda fixa nesta carteira',
    );
    expect(noResultTitle(none, TESOURO, RICO)).toBe(
      'Nenhuma operação de Tesouro IPCA+ 2035 na Rico',
    );
  });
});
