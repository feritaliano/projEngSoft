import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ErrorHandler } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { text } from '../../../testing/text';
import { provideApiConfiguration } from '../../api/api-configuration';
import { AssetDto } from '../../api/models';
import { SKELETON_DELAY_MS } from '../../shared/ui/load-error';
import { AssetsPage, SEARCH_DEBOUNCE_MS } from './assets-page';

const API = 'http://api.test';
const ASSETS_URL = `${API}/api/v1/assets`;

const ITSA4: AssetDto = {
  id: 'a1',
  ticker: 'ITSA4',
  assetType: 'STOCK',
  displayName: 'ITSA4',
  issuer: 'Itaúsa S.A.',
  sector: 'Financeiro › Holdings Diversificadas',
};
const TESOURO: AssetDto = {
  id: 'a2',
  ticker: null,
  assetType: 'FIXED_INCOME',
  displayName: 'Tesouro IPCA+ 2035',
  issuer: 'Tesouro Nacional',
  sector: null,
};
const BTC: AssetDto = {
  id: 'a3',
  ticker: 'BTC',
  assetType: 'CRYPTO',
  displayName: 'Bitcoin',
  issuer: null,
  sector: null,
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('AssetsPage (frame 7, C1)', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<AssetsPage>;
  let element: HTMLElement;
  let handleError: ReturnType<typeof vi.fn>;

  const searches = () => http.expectOne((r) => r.url === ASSETS_URL);
  const settle = () => fixture.whenStable();
  const button = (label: string) =>
    [...element.querySelectorAll('button')].find((b) => text(b) === label);
  const type = async (value: string) => {
    const field = element.querySelector<HTMLInputElement>('#asset-search')!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await wait(SEARCH_DEBOUNCE_MS + 20);
    await settle();
  };
  const open = async (items: AssetDto[] = [ITSA4, TESOURO, BTC], total = 3) => {
    fixture = TestBed.createComponent(AssetsPage);
    element = fixture.nativeElement;
    await settle();
    const first = searches();
    first.flush({ items, total });
    await settle();
    return first;
  };

  beforeEach(() => {
    handleError = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(API),
        { provide: ErrorHandler, useValue: { handleError } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the catalog with code, name, sector and class; ticker or name when there is none (D50)', async () => {
    const first = await open();

    expect(first.request.params.has('search')).toBe(false);
    expect(text(element.querySelector('h1'))).toBe('Ativos');
    expect(element.querySelector('label[for="asset-search"]')?.textContent?.trim()).toBe(
      'Buscar ativo',
    );
    expect([...element.querySelectorAll('table tbody tr')].map(text)).toEqual([
      'IT ITSA4 Itaúsa S.A. Financeiro › Holdings Diversificadas Ação',
      'TE Tesouro IPCA+ 2035 Tesouro Nacional Sem classificação na B3 Renda fixa',
      'BT BTC Bitcoin Sem classificação na B3 Cripto',
    ]);
    expect(text(element.querySelector('nav'))).toBe('Ordem alfabética · 20 por página');
  });

  it('searches by ticker or issuer after a pause in typing, counting what it found', async () => {
    await open();

    await type('  itausa ');
    const request = searches();
    expect(request.request.params.get('search')).toBe('itausa');
    expect(request.request.params.get('page')).toBe('1');
    expect(text(element.querySelector('[aria-live="polite"]'))).toBe('Buscando “itausa”…');
    request.flush({ items: [ITSA4], total: 1 });
    await settle();

    expect(text(element.querySelector('[aria-live="polite"]'))).toBe(
      '1 ativo encontrado para “itausa”',
    );
    expect(element.querySelectorAll('table tbody tr')).toHaveLength(1);
  });

  it('waits for the pause in typing: one search for several keys, none before 300 ms', async () => {
    await open();
    const field = element.querySelector<HTMLInputElement>('#asset-search')!;

    for (const value of ['p', 'pe', 'pet']) {
      field.value = value;
      field.dispatchEvent(new Event('input'));
      await wait(50);
    }
    http.expectNone((r) => r.url === ASSETS_URL);
    await wait(SEARCH_DEBOUNCE_MS);
    searches().flush({ items: [], total: 0 });

    expect(field.maxLength).toBe(100);
  });

  it('a new search cancels the previous one and starts again on page 1', async () => {
    await open([ITSA4], 45);
    button('Próxima página →')!.click();
    await settle();
    searches().flush({ items: [TESOURO], total: 45 });
    await settle();

    await type('itau');
    const slow = searches();
    expect(slow.request.params.get('page')).toBe('1');
    await type('petro');
    const current = searches();
    expect(slow.cancelled).toBe(true);
    current.flush({ items: [ITSA4], total: 1 });
    await settle();

    expect(text(element.querySelector('[aria-live="polite"]'))).toBe(
      '1 ativo encontrado para “petro”',
    );
    expect(button('← Página anterior')).toBeUndefined();
  });

  it('moves the focus to the title when a page arrives, since the page buttons are replaced (U5)', async () => {
    await open([ITSA4], 45);

    button('Próxima página →')!.click();
    await settle();
    searches().flush({ items: [TESOURO], total: 45 });
    await settle();
    expect(document.activeElement?.tagName).toBe('H1');

    button('← Página anterior')!.click();
    await settle();
    expect(searches().request.params.get('page')).toBe('1');
  });

  it('also reports an answer the front did not expect (400), a bug of the front', async () => {
    await open();

    await type('itau');
    searches().flush({ status: 400 }, { status: 400, statusText: 'Bad Request' });
    await settle();

    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(handleError).toHaveBeenCalledTimes(1);
  });

  it('shows "sem resultado" with the search and clears it back to the catalog', async () => {
    await open();

    await type('PETRX');
    searches().flush({ items: [], total: 0 });
    await settle();
    expect(text(element.querySelector('section h2'))).toBe('Nenhum ativo encontrado para “PETRX”');

    button('Limpar busca')!.click();
    await settle();
    const request = searches();
    expect(request.request.params.has('search')).toBe(false);
    request.flush({ items: [ITSA4], total: 1 });
    await settle();
    expect(element.querySelector<HTMLInputElement>('#asset-search')!.value).toBe('');
    expect(document.activeElement?.id).toBe('asset-search');
    // Clearing the field does not trigger a second search after the debounce.
    await wait(SEARCH_DEBOUNCE_MS + 20);
    http.expectNone((r) => r.url === ASSETS_URL);
  });

  it('pages 20 at a time', async () => {
    await open([ITSA4], 45);

    button('Próxima página →')!.click();
    await settle();
    const second = searches();
    expect(second.request.params.get('page')).toBe('2');
    second.flush({ items: [TESOURO], total: 45 });
    await settle();

    expect(button('← Página anterior')).toBeDefined();
    button('Próxima página →')!.click();
    await settle();
    searches().flush({ items: [BTC], total: 45 });
    await settle();
    expect(button('Próxima página →')).toBeUndefined();
  });

  it('keeps the search in the field on error and searches again on "Tentar de novo" (U7a)', async () => {
    await open();

    await type('petro');
    searches().flush({ status: 500 }, { status: 500, statusText: 'Error' });
    await settle();
    expect(text(element.querySelector('[role="alert"] h2'))).toBe(
      'Não conseguimos buscar os ativos',
    );
    expect(element.querySelector<HTMLInputElement>('#asset-search')!.value).toBe('petro');
    expect(handleError).not.toHaveBeenCalled();

    button('Tentar de novo')!.click();
    await settle();
    expect(document.activeElement?.tagName).toBe('H1');
    const again = searches();
    expect(again.request.params.get('search')).toBe('petro');
    again.flush({ items: [], total: 0 });
  });

  it('shows the skeleton only after 300 ms without an answer (U5)', async () => {
    fixture = TestBed.createComponent(AssetsPage);
    element = fixture.nativeElement;
    await settle();
    expect(element.querySelector('[aria-busy="true"] div')).toBeNull();

    await wait(SKELETON_DELAY_MS + 20);
    fixture.detectChanges();
    expect(element.querySelector('[aria-busy="true"] div')).not.toBeNull();
    expect(text(element.querySelector('[aria-busy="true"]'))).toBe('Carregando…');

    searches().flush({ items: [], total: 0 });
  });
});
