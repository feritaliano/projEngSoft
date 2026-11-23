import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
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
  let handleError: ReturnType<typeof vi.fn>;

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
    handleError = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(API),
        provideRouter([
          { path: 'carteiras/:id', children: [] },
          { path: 'carteiras/:id/historico', component: OperationHistoryPage },
          { path: 'carteiras/:id/operacoes/nova', children: [] },
          { path: 'carteiras/:id/operacoes/:operationId/editar', children: [] },
        ]),
        { provide: ErrorHandler, useValue: { handleError } },
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

    // The selects show the cleared filters too.
    button('Limpar filtros').click();
    await settle();
    operations().flush({ items: OPERATIONS, total: 11 });
    await settle();
    expect(element.querySelector<HTMLSelectElement>('#filter-asset')!.value).toBe('');
    expect(element.querySelector<HTMLSelectElement>('#filter-broker')!.value).toBe('');
  });

  it('a filter changed before the answer cancels the previous list, so a late answer cannot replace it', async () => {
    await open();

    button('FIIs').click();
    await settle();
    button('Ações').click();
    await settle();
    const [fiis, stocks] = http.match((r) => r.url === OPERATIONS_URL);
    expect(fiis.cancelled).toBe(true);
    expect(stocks.request.params.get('assetType')).toBe('STOCK');
    stocks.flush({ items: [], total: 0 });
    await settle();

    expect(button('Ações').getAttribute('aria-pressed')).toBe('true');
    expect(text(element.querySelector('section h2'))).toBe(
      'Nenhuma operação de ações nesta carteira',
    );
  });

  it('a filter changed while "Carregar mais" waits leaves the button usable for the new list', async () => {
    await open(LONGO, OPERATIONS.slice(0, 2), 60);

    button('Carregar mais').click();
    await settle();
    button('FIIs').click();
    await settle();
    const [more, fiis] = http.match((r) => r.url === OPERATIONS_URL);
    expect(more.cancelled).toBe(true);
    fiis.flush({ items: OPERATIONS.slice(0, 2), total: 60 });
    await settle();

    expect(button('Carregar mais').disabled).toBe(false);
    expect(button('Carregar mais').getAttribute('aria-busy')).toBeNull();
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
    expect(
      [...element.querySelectorAll('a')]
        .find((a) => text(a) === 'Lançar primeira operação')
        ?.getAttribute('href'),
    ).toBe('/carteiras/p1/operacoes/nova');
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
    // The loading region goes away with the answer: the focus moves on to the title (U7a).
    expect(document.activeElement?.tagName).toBe('H1');
    expect(handleError).not.toHaveBeenCalled();
  });

  it('also reports an answer the front did not expect (400), a bug of the front', async () => {
    await open();

    button('ETFs').click();
    await settle();
    fail(operations(), 400);
    await settle();

    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(handleError).toHaveBeenCalledTimes(1);
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
  describe('edit and delete by row (B4, C3)', () => {
    // Deletion has no DOM <dialog> in jsdom; the browser behavior is covered by the E2E.
    beforeAll(() => {
      HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
        this.open = true;
      };
      HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
        this.open = false;
      };
    });

    const action = (label: string) =>
      element.querySelector<HTMLButtonElement>(`table button[aria-label="${label}"]`)!;
    const reload = async () => {
      http.expectOne(PORTFOLIO_URL).flush(LONGO);
      http.expectOne(`${PORTFOLIO_URL}/positions`).flush([]);
      http.expectOne(`${API}/api/v1/brokers`).flush([]);
      operations().flush({ items: OPERATIONS.slice(1), total: 10 });
      await settle();
    };
    const confirmDeletion = async (label: string) => {
      action(label).click();
      await settle();
      const dialog = element.querySelector('app-confirm-dialog')!;
      const confirm = [...dialog.querySelectorAll('button')].find((b) =>
        text(b).startsWith('Excluir'),
      )!;
      return { dialog, confirm };
    };

    it('names the icons by date and asset (microcopy, section 7) and opens the edit form', async () => {
      await open();

      expect(text(element.querySelector('thead th:last-child'))).toBe('Ações');
      action('Editar operação de 22/05/2026, MXRF11').click();
      await settle();

      expect(TestBed.inject(Router).url).toBe('/carteiras/p1/operacoes/o8/editar');
    });

    it('deletes after the confirmation and loads the list again', async () => {
      await open();
      const { dialog, confirm } = await confirmDeletion('Excluir operação de 22/05/2026, MXRF11');

      expect(text(dialog.querySelector('h2'))).toBe('Excluir a venda de 22/05/2026?');
      expect(text(dialog.querySelector('p'))).toBe(
        'A venda de 50 MXRF11 será apagada. A posição, o preço médio e o lucro realizado de MXRF11 nesta carteira serão recalculados a partir de 22/05/2026.',
      );
      expect(text(confirm)).toBe('Excluir venda');
      confirm.click();
      http.expectOne({ method: 'DELETE', url: `${OPERATIONS_URL}/o8` }).flush(null, {
        status: 204,
        statusText: 'No Content',
      });
      await settle();
      await reload();

      expect(element.querySelector('app-confirm-dialog')).toBeNull();
      expect(element.querySelectorAll('table tbody tr')).toHaveLength(3);
    });

    it('shows the RN10 of a refused deletion and puts the purchase in evidence', async () => {
      await open();
      const { confirm } = await confirmDeletion(
        'Excluir operação de 02/03/2026, Tesouro IPCA+ 2035',
      );
      confirm.click();
      const violation = {
        rule: 'RN10',
        operation: { ...OPERATIONS[2], type: 'SELL' },
        availableQuantity: '0',
        soldQuantity: '50',
      };
      http
        .expectOne({ method: 'DELETE', url: `${OPERATIONS_URL}/o6` })
        .flush(
          { status: 422, title: 'Unprocessable', violation },
          { status: 422, statusText: 'x' },
        );
      await settle();

      expect(element.querySelector('app-confirm-dialog')).toBeNull();
      const error = element.querySelector('app-business-rule-error section')!;
      expect(error.getAttribute('role')).toBe('alert');
      expect(text(error)).toContain(
        'Excluir a compra de 02/03/2026 faz a venda de 22/05/2026 ficar maior que a posição. Nada foi apagado.',
      );
      const rows = element.querySelectorAll('table tbody tr');
      expect(rows[3].className).toContain('bg-negative-subtle');
      expect(rows[2].className).not.toContain('bg-negative-subtle');
    });

    it('sends nothing when the confirmation is cancelled (C3)', async () => {
      await open();
      const { dialog } = await confirmDeletion('Excluir operação de 22/05/2026, MXRF11');
      [...dialog.querySelectorAll('button')].find((b) => text(b) === 'Cancelar')!.click();
      await settle();

      expect(element.querySelector('app-confirm-dialog')).toBeNull();
      http.expectNone({ method: 'DELETE' });
    });

    it('says the operation was already deleted on a 404 and loads the list again', async () => {
      await open();
      const { confirm } = await confirmDeletion('Excluir operação de 22/05/2026, MXRF11');
      confirm.click();
      fail(http.expectOne({ method: 'DELETE', url: `${OPERATIONS_URL}/o8` }), 404);
      await settle();
      await reload();

      expect(text(element.querySelector('p[role="status"]'))).toBe(
        'Esta operação já tinha sido excluída. A lista foi atualizada.',
      );
      expect(handleError).not.toHaveBeenCalled();
    });

    it('puts in evidence the sale of the link "Ver venda de …" (?operacao=)', async () => {
      await open();
      await TestBed.inject(Router).navigateByUrl('/carteiras/p1/historico?operacao=o8');
      await settle();

      const rows = element.querySelectorAll('table tbody tr');
      expect(rows[2].className).toContain('bg-negative-subtle');
    });
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
