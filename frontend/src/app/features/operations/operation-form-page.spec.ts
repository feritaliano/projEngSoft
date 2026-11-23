import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../api/api-configuration';
import {
  AssetRef,
  BrokerDto,
  OperationDto,
  OperationPreview,
  PortfolioDto,
  RuleViolation,
} from '../../api/models';
import { AVG_PRICE, GROSS, PETR4, TOTAL_BUY } from '../../../testing/derived-values';
import { text } from '../../../testing/text';
import { SKELETON_DELAY_MS } from '../../shared/ui/load-error';
import { FormState, OperationFormPage, PREVIEW_DEBOUNCE_MS } from './operation-form-page';

// jsdom has no modal <dialog>; the browser behavior is covered by the E2E.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

const API = 'http://api.test';
const PORTFOLIO_URL = `${API}/api/v1/portfolios/p1`;
const OPERATIONS_URL = `${PORTFOLIO_URL}/operations`;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const LONGO: PortfolioDto = {
  id: 'p1',
  name: 'Longo prazo',
  operationCount: 11,
  assetCount: 6,
  lastTradeDate: '2026-10-28',
};
const BROKERS: BrokerDto[] = [
  { id: 'b-nu', name: 'NuInvest', cnpj: null },
  { id: 'b-xp', name: 'XP Investimentos', cnpj: null },
];
const MXRF11 = { id: 'a-mxrf', ticker: 'MXRF11', displayName: 'MXRF11', assetType: 'FII' as const };
const MXRF_BUY: OperationDto = {
  id: 'o3',
  type: 'BUY',
  tradeDate: '2026-01-08',
  quantity: '200',
  unitPrice: '10.1',
  fees: '4',
  asset: MXRF11,
  broker: { id: 'b-nu', name: 'NuInvest' },
};
const PREVIEW: OperationPreview = {
  grossAmount: GROSS,
  netAmount: TOTAL_BUY,
  positionBefore: '100',
  positionAfter: '150',
  averagePriceBefore: AVG_PRICE,
  averagePriceAfter: { ...AVG_PRICE, value: '33.3866' },
};
const sale = (rule: 'RN07' | 'RN10', asset: AssetRef = PETR4): RuleViolation => ({
  rule,
  operation: {
    id: rule === 'RN07' ? null : 'o7',
    type: 'SELL',
    tradeDate: rule === 'RN07' ? '2026-10-28' : '2026-05-22',
    quantity: '150',
    asset,
    broker: { id: 'b-xp', name: 'XP Investimentos' },
  },
  availableQuantity: rule === 'RN07' ? '100' : '40',
  soldQuantity: rule === 'RN07' ? '150' : '50',
});

@Component({ template: '' })
class Blank {}

describe('OperationFormPage (frame 5, B2–B4, D42)', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let handleError: ReturnType<typeof vi.fn>;

  const element = () => harness.routeNativeElement as HTMLElement;
  const settle = () => harness.fixture.whenStable();
  const shown = () => text(element()).replaceAll(String.fromCharCode(0xa0), ' ');
  const field = (id: string) => element().querySelector<HTMLInputElement>(`#${id}`)!;
  const button = (name: string) =>
    [...element().querySelectorAll<HTMLButtonElement>('button')].find((b) => text(b) === name)!;

  const open = async (url = '/carteiras/p1/operacoes/nova', state?: FormState) => {
    harness = await RouterTestingHarness.create();
    await TestBed.inject(Router).navigateByUrl(url, { state });
    await settle();
  };
  const load = async (operation?: OperationDto | number) => {
    http.expectOne({ method: 'GET', url: PORTFOLIO_URL }).flush(LONGO);
    http.expectOne({ method: 'GET', url: `${API}/api/v1/brokers` }).flush(BROKERS);
    if (operation !== undefined) {
      const request = http.expectOne({ method: 'GET', url: `${OPERATIONS_URL}/o3` });
      if (typeof operation === 'number') {
        request.flush({ status: operation }, { status: operation, statusText: 'Error' });
      } else request.flush(operation);
    }
    await settle();
  };
  const type = async (id: string, value: string) => {
    const input = field(id);
    input.value = value;
    input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input'));
    input.dispatchEvent(new Event('blur'));
    await settle();
  };
  const fillBuy = async () => {
    await type('operation-broker', 'b-xp');
    await type('operation-date', '2026-10-28');
    await type('operation-quantity', '50');
    await type('operation-price', '36,00');
    await type('operation-fees', '4,90');
  };
  const previewRequest = async () => {
    await wait(PREVIEW_DEBOUNCE_MS + 20);
    return http.expectOne({ method: 'POST', url: `${OPERATIONS_URL}/preview` });
  };

  beforeEach(() => {
    handleError = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(API),
        provideRouter([
          { path: 'carteiras/:id/operacoes/nova', component: OperationFormPage },
          { path: 'carteiras/:id/operacoes/:operationId/editar', component: OperationFormPage },
          { path: 'carteiras/:id/historico', component: Blank },
          { path: 'carteiras/:id', component: Blank },
        ]),
        { provide: ErrorHandler, useValue: { handleError } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('opens the create mode with the portfolio, the brokers, today and the waiting summary', async () => {
    await open();
    await load();

    expect(text(element().querySelector('h1'))).toBe('Lançar operação');
    expect(text(element().querySelector('nav[aria-label="Trilha de navegação"]'))).toBe(
      'Carteiras / Longo prazo / Lançar operação',
    );
    expect(shown()).toContain('Carteira Longo prazo');
    expect(
      [...element().querySelector<HTMLSelectElement>('#operation-broker')!.options].map(
        (o) => o.text,
      ),
    ).toEqual(['', 'NuInvest', 'XP Investimentos']);
    const date = field('operation-date');
    expect(date.max).toBe(date.value); // today in São Paulo (D54)
    expect(shown()).toContain(`Até hoje, ${date.value.split('-').reverse().join('/')}.`);
    expect(field('operation-fees').value).toBe('0,00');
    expect(shown()).toContain('Preencha ativo, corretora, data, quantidade e preço');
    expect(text(button('Lançar compra'))).toBe('Lançar compra');
  });

  it('shows the field errors by code on submit and focuses the first invalid field (D56)', async () => {
    await open();
    await load();
    await type('operation-date', '2999-01-01');
    await type('operation-quantity', '1,5');

    button('Lançar compra').click();
    await settle();

    expect(document.activeElement?.id).toBe('operation-asset');
    expect(shown()).toContain('Escolha um ativo da lista.');
    expect(shown()).toContain('Escolha a corretora.');
    expect(shown()).toMatch(/A data não pode ser depois de hoje \(\d{2}\/\d{2}\/\d{4}\)\./);
    expect(shown()).toContain('Use um número inteiro maior que zero.');
    expect(shown()).toContain('Informe o preço unitário.');
  });

  it('previews the valid form with the decimal strings of the API and shows the values (D42)', async () => {
    await open('/carteiras/p1/operacoes/nova', { asset: PETR4 });
    await load();
    expect(field('operation-asset').value).toBe('PETR4');
    await fillBuy();

    const request = await previewRequest();
    expect(request.request.body).toEqual({
      type: 'BUY',
      assetId: PETR4.id,
      brokerId: 'b-xp',
      tradeDate: '2026-10-28',
      quantity: '50',
      unitPrice: '36.00',
      fees: '4.90',
    });
    request.flush(PREVIEW);
    await settle();

    expect(shown()).toContain('Calculado pelo servidor a partir das suas operações.');
    expect(shown()).toContain('Total com custos R$ 1.804,90');
    expect(shown()).toContain('Na carteira Longo prazo, em 28/10/2026, após esta compra');
    expect(button('Lançar compra').disabled).toBe(false);
  });

  it('shows "Calculando…" only when the preview takes longer than 300 ms', async () => {
    await open('/carteiras/p1/operacoes/nova', { asset: PETR4 });
    await load();
    await fillBuy();
    const request = await previewRequest();
    await settle();
    expect(shown()).not.toContain('Calculando…');

    await wait(SKELETON_DELAY_MS + 20);
    await settle();
    expect(shown()).toContain('Calculando…');
    request.flush(PREVIEW);
    await settle();
    expect(shown()).not.toContain('Calculando…');
  });

  it('blocks the save while the preview shows a violation (RN07), politely, with the field help', async () => {
    await open('/carteiras/p1/operacoes/nova', { asset: PETR4 });
    await load();
    element().querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click(); // Venda
    await fillBuy();
    (await previewRequest()).flush({
      ...PREVIEW,
      positionAfter: null,
      averagePriceAfter: null,
      realizedProfit: null,
      violation: sale('RN07'),
    });
    await settle();

    const error = element().querySelector('app-business-rule-error section')!;
    expect(error.getAttribute('aria-live')).toBe('polite');
    expect(text(error)).toContain('A venda é maior que a sua posição');
    expect(button('Lançar venda').disabled).toBe(true);
    const quantity = field('operation-quantity');
    expect(quantity.getAttribute('aria-invalid')).toBe('true');
    expect(text(element().querySelector(`#${quantity.getAttribute('aria-describedby')}`))).toBe(
      'Máximo de 100 nesta data.',
    );
  });

  it('keeps the save enabled when the preview fails, and calculates again on demand', async () => {
    await open('/carteiras/p1/operacoes/nova', { asset: PETR4 });
    await load();
    await fillBuy();
    (await previewRequest()).flush({}, { status: 500, statusText: 'Error' });
    await settle();

    expect(shown()).toContain('Não deu para calcular o resumo agora.');
    expect(button('Lançar compra').disabled).toBe(false);
    expect(handleError).not.toHaveBeenCalled();

    button('Calcular de novo').click();
    http.expectOne({ method: 'POST', url: `${OPERATIONS_URL}/preview` }).flush(PREVIEW);
    await settle();
    expect(shown()).toContain('Total com custos R$ 1.804,90');
  });

  it('saves, shows the notice and starts a new operation keeping type and broker (frame "sucesso")', async () => {
    await open('/carteiras/p1/operacoes/nova', { asset: PETR4 });
    await load();
    await fillBuy();
    (await previewRequest()).flush(PREVIEW);
    await settle();

    button('Lançar compra').click();
    const save = http.expectOne({ method: 'POST', url: OPERATIONS_URL });
    save.flush({ ...MXRF_BUY, id: 'o12', asset: PETR4, quantity: '50' });
    await settle();

    const notice = element().querySelector('#operation-saved')!;
    expect(text(notice)).toContain('Compra de 50 PETR4 lançada na carteira Longo prazo.');
    expect(text(notice)).toContain(
      'Posição, preço médio e custo total de PETR4 foram recalculados.',
    );
    expect(notice.querySelector('button')?.textContent?.trim()).toBe(
      'Ver como o preço médio mudou',
    );
    expect(document.activeElement).toBe(notice);
    expect(field('operation-asset').value).toBe('');
    expect(field('operation-quantity').value).toBe('');
    expect(field('operation-broker').value).toBe('b-xp');
    expect(shown()).toContain('Voltar para a carteira');
    await wait(PREVIEW_DEBOUNCE_MS + 20); // the reset asks nothing: the form is not valid
  });

  it('shows the 422 of the save as an alert (RN10 of a retroactive sale) and the 400 under the field', async () => {
    await open('/carteiras/p1/operacoes/nova', { asset: PETR4 });
    await load();
    await fillBuy();
    (await previewRequest()).flush({}, { status: 503, statusText: 'Error' });
    await settle();

    button('Lançar compra').click();
    http.expectOne({ method: 'POST', url: OPERATIONS_URL }).flush(
      { status: 422, title: 'Unprocessable', violation: sale('RN10') },
      {
        status: 422,
        statusText: 'Unprocessable',
      },
    );
    await settle();
    const error = element().querySelector('app-business-rule-error section')!;
    expect(error.getAttribute('role')).toBe('alert');
    expect(text(error)).toContain('Lançar esta venda em 28/10/2026 faz a venda de 22/05/2026');

    button('Lançar compra').click();
    http.expectOne({ method: 'POST', url: OPERATIONS_URL }).flush(
      {
        status: 400,
        title: 'Bad Request',
        errors: [
          { field: 'unitPrice', code: 'TOO_LARGE', message: 'x', params: { maxIntegerDigits: 12 } },
        ],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await settle();
    expect(shown()).toContain('Preço grande demais: até 12 dígitos antes da vírgula.');
    expect(document.activeElement?.id).toBe('operation-price');
  });

  it('edits: fills the form from the GET, previews replacing it, confirms and goes to the History', async () => {
    await open('/carteiras/p1/operacoes/o3/editar');
    await load(MXRF_BUY);

    expect(text(element().querySelector('h1'))).toBe('Editar operação');
    expect(text(element().querySelector('nav[aria-label="Trilha de navegação"]'))).toBe(
      'Carteiras / Longo prazo / Histórico / Editar operação',
    );
    expect(field('operation-asset').value).toBe('MXRF11');
    expect(field('operation-quantity').value).toBe('200');
    expect(field('operation-price').value).toBe('10,10');
    expect(field('operation-fees').value).toBe('4,00');
    const first = await previewRequest();
    expect(first.request.body.replacesOperationId).toBe('o3');
    first.flush(PREVIEW);

    await type('operation-quantity', '220');
    (await previewRequest()).flush(PREVIEW);
    await settle();
    expect(shown()).toContain('MXRF11 em 08/01/2026, com a alteração');

    button('Salvar alteração').click();
    await settle();
    const dialog = element().querySelector('app-confirm-dialog')!;
    expect(text(dialog)).toContain('Salvar a alteração na compra de 08/01/2026?');
    expect(text(dialog)).toContain(
      'A posição, o preço médio e o lucro realizado de MXRF11 nesta carteira serão recalculados a partir de 08/01/2026.',
    );
    [...dialog.querySelectorAll('button')].find((b) => text(b) === 'Salvar alteração')!.click();
    const patch = http.expectOne({ method: 'PATCH', url: `${OPERATIONS_URL}/o3` });
    expect(patch.request.body.quantity).toBe('220');
    patch.flush({ ...MXRF_BUY, quantity: '220' });
    await settle();

    expect(TestBed.inject(Router).url).toBe('/carteiras/p1/historico?operacao=o3');
  });

  it('edits to 40 units: the RN10 of the preview names the edit and blocks the save', async () => {
    await open('/carteiras/p1/operacoes/o3/editar');
    await load(MXRF_BUY);
    (await previewRequest()).flush(PREVIEW);
    await type('operation-quantity', '40');
    (await previewRequest()).flush({ ...PREVIEW, violation: sale('RN10', MXRF11) });
    await settle();

    const error = element().querySelector('app-business-rule-error')!;
    expect(text(error)).toContain(
      'Com esta alteração na compra de 08/01/2026, a venda de 22/05/2026 fica maior que a posição.',
    );
    expect(error.querySelector('a')?.getAttribute('href')).toBe(
      '/carteiras/p1/historico?operacao=o7',
    );
    expect(button('Salvar alteração').disabled).toBe(true);
    expect(shown()).toContain('Afeta a venda de 22/05/2026: 50 vendidas, 40 disponíveis.');
  });

  it('names the change of asset when the RN10 is about the asset the buy left (C2)', async () => {
    await open('/carteiras/p1/operacoes/o3/editar');
    await load({ ...MXRF_BUY });
    (await previewRequest()).flush(PREVIEW);
    await settle();
    // Another asset from the search; the violation is still about MXRF11, which the buy left.
    await type('operation-asset', 'PETR');
    await wait(PREVIEW_DEBOUNCE_MS + 20);
    http
      .expectOne((r) => r.url === `${API}/api/v1/assets`)
      .flush({ items: [{ ...PETR4, issuer: 'Petrobras', sector: null }], total: 1 });
    await settle();
    element().querySelector<HTMLElement>('[role="option"]')!.click();
    (await previewRequest()).flush({ ...PREVIEW, violation: sale('RN10', MXRF11) });
    await settle();

    expect(text(element().querySelector('app-business-rule-error'))).toContain(
      'Trocar o ativo deixaria uma venda maior que a posição',
    );
  });

  it('says the operation no longer exists when the GET answers 404, with the save disabled', async () => {
    await open('/carteiras/p1/operacoes/o3/editar');
    await load(404);

    expect(text(element().querySelector('[role="alert"]'))).toContain(
      'Esta operação não existe mais',
    );
    expect(shown()).toContain('Sem resumo: esta operação não existe mais.');
    expect(button('Salvar alteração').disabled).toBe(true);
  });

  it('turns to "não existe mais" when the preview says replacesOperationId NOT_FOUND', async () => {
    await open('/carteiras/p1/operacoes/o3/editar');
    await load(MXRF_BUY);
    (await previewRequest()).flush(
      {
        status: 400,
        title: 'Bad Request',
        errors: [{ field: 'replacesOperationId', code: 'NOT_FOUND', message: 'x' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await settle();

    expect(shown()).toContain('Esta operação não existe mais');
    expect(button('Salvar alteração').disabled).toBe(true);
  });

  it('shows the not found page for a portfolio of another user (RN02)', async () => {
    await open();
    http
      .expectOne({ method: 'GET', url: PORTFOLIO_URL })
      .flush({}, { status: 404, statusText: 'x' });
    const brokers = http.expectOne(`${API}/api/v1/brokers`);
    if (!brokers.cancelled) brokers.flush(BROKERS);
    await settle();

    expect(text(element().querySelector('h1'))).toBe('Página não encontrada');
  });

  it('shows the error card on a 5xx and loads again', async () => {
    await open();
    http
      .expectOne({ method: 'GET', url: PORTFOLIO_URL })
      .flush({}, { status: 500, statusText: 'x' });
    const brokers = http.expectOne(`${API}/api/v1/brokers`);
    if (!brokers.cancelled) brokers.flush(BROKERS);
    await settle();
    expect(shown()).toContain('Não conseguimos carregar esta carteira');

    button('Tentar de novo').click();
    await load();
    expect(field('operation-broker')).not.toBeNull();
  });
});
