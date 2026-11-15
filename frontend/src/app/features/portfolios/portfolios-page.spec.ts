import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../api/api-configuration';
import { PortfolioDto } from '../../api/models';
import {
  PortfoliosPage,
  SKELETON_DELAY_MS,
  deletionText,
  portfolioSummary,
} from './portfolios-page';

const API = 'http://api.test';
const LIST_URL = `${API}/api/v1/portfolios`;

// jsdom has no modal <dialog>; the browser behavior is covered by the E2E.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

const portfolio = (overrides: Partial<PortfolioDto>): PortfolioDto => ({
  id: 'p1',
  name: 'Longo prazo',
  operationCount: 11,
  assetCount: 6,
  lastTradeDate: '2026-06-02',
  ...overrides,
});
const SEED = [
  portfolio({}),
  portfolio({ id: 'p2', name: 'Dividendos', operationCount: 6, assetCount: 3 }),
  portfolio({
    id: 'p3',
    name: 'Testes FII',
    operationCount: 0,
    assetCount: 0,
    lastTradeDate: null,
  }),
];
const problem = (status: number, extra: object = {}) => ({
  type: 'about:blank',
  title: 'Error',
  status,
  ...extra,
});

describe('portfolioSummary and deletionText (microcopy, section 11; frame C3)', () => {
  it('counts assets and operations, in the singular when there is one', () => {
    expect(portfolioSummary(portfolio({}))).toBe('6 ativos · 11 operações');
    expect(portfolioSummary(portfolio({ assetCount: 1, operationCount: 1 }))).toBe(
      '1 ativo · 1 operação',
    );
    expect(portfolioSummary(portfolio({ assetCount: 0, operationCount: 0 }))).toBe(
      'Sem operações ainda',
    );
    expect(portfolioSummary(portfolio({ assetCount: 0, operationCount: 4 }))).toBe(
      'nenhuma posição aberta · 4 operações',
    );
  });

  it('says how many operations go with the portfolio', () => {
    expect(deletionText(11)).toBe(
      'Isto apaga a carteira e as 11 operações lançadas nela. A posição, o preço médio e o lucro realizado ' +
        'calculados a partir delas deixam de existir. Não dá para desfazer.',
    );
    expect(deletionText(1)).toContain('Isto apaga a carteira e a 1 operação lançada nela.');
  });
});

describe('PortfoliosPage', () => {
  let http: HttpTestingController;
  let handleError: ReturnType<typeof vi.fn>;

  const open = async (list: PortfolioDto[] | 'pending' = SEED) => {
    const harness = await RouterTestingHarness.create();
    document.body.appendChild(harness.fixture.nativeElement);
    await harness.navigateByUrl('/carteiras');
    const element = harness.routeNativeElement as HTMLElement;
    const stable = () => harness.fixture.whenStable();
    if (list !== 'pending') {
      http.expectOne({ method: 'GET', url: LIST_URL }).flush(list);
      await stable();
    }
    const button = (name: string) =>
      [...element.querySelectorAll('button')].find(
        (b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name,
      ) as HTMLButtonElement;
    const type = async (id: string, value: string) => {
      const input = element.querySelector(`#${id}`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await stable();
    };
    const cards = () =>
      [...element.querySelectorAll('li')].map(
        (li) =>
          `${li.querySelector('a')?.textContent?.trim()} ${li.querySelector('p')?.textContent?.trim()}`,
      );
    const hint = () => element.querySelector('#portfolio-name-hint')?.textContent?.trim();
    return { harness, element, stable, button, type, cards, hint };
  };

  beforeEach(() => {
    handleError = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(API),
        provideRouter([{ path: 'carteiras', component: PortfoliosPage }]),
        { provide: ErrorHandler, useValue: { handleError } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('with data', () => {
    it('shows each portfolio with its assets and operations, only the S1 data (D48)', async () => {
      const { element, cards } = await open();

      expect(element.querySelector('h1')?.textContent?.trim()).toBe('Suas carteiras');
      expect(cards()).toEqual([
        'Longo prazo 6 ativos · 11 operações',
        'Dividendos 3 ativos · 6 operações',
        'Testes FII Sem operações ainda',
      ]);
      expect(element.textContent).not.toContain('Patrimônio');
      expect(element.textContent).not.toContain('Rentabilidade');
      expect(element.querySelector('[aria-busy]')).toBeNull();
    });

    it('opens the portfolio from the name link, with the delete icon above it (D51)', async () => {
      const { element, button } = await open();
      const link = element.querySelector('li a') as HTMLAnchorElement;

      expect(link.getAttribute('href')).toBe('/carteiras/p1');
      expect(link.textContent?.trim()).toBe('Longo prazo');
      expect(link.title).toBe('Longo prazo');
      expect(button('Excluir carteira Longo prazo')).toBeDefined();
      expect(button('Excluir carteira Testes FII')).toBeDefined();
      // The arrow is decorative: the link is the name.
      expect(element.querySelectorAll('li a')).toHaveLength(3);
    });
  });

  describe('loading', () => {
    it('shows the skeleton only after 300 ms without an answer, with "Nova carteira" disabled', async () => {
      const { element, stable, button } = await open('pending');

      expect(element.querySelector('[aria-busy="true"]')?.textContent?.trim()).toBe('');
      expect(button('Nova carteira').disabled).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, SKELETON_DELAY_MS + 20));
      await stable();
      expect(element.querySelector('[aria-busy="true"]')?.textContent).toContain(
        'Carregando suas carteiras…',
      );

      http.expectOne(LIST_URL).flush(SEED);
      await stable();
      expect(element.querySelector('[aria-busy]')).toBeNull();
      expect(button('Nova carteira').disabled).toBe(false);
    });
  });

  describe('error (U7a)', () => {
    it('shows the error card and "Tentar de novo" loads again, with the focus on the title', async () => {
      const { element, stable, button, cards } = await open('pending');
      http.expectOne(LIST_URL).flush(problem(500), { status: 500, statusText: 'Error' });
      await stable();

      const alert = element.querySelector('[role="alert"]');
      expect(alert?.textContent).toContain('Não conseguimos carregar suas carteiras');
      expect(alert?.textContent).toContain(
        'O servidor teve um problema. Suas carteiras e operações continuam salvas.',
      );
      expect(button('Nova carteira').disabled).toBe(true);

      button('Tentar de novo').click();
      await stable();
      expect(element.querySelector('[role="alert"]')).toBeNull();
      expect(document.activeElement?.tagName).toBe('H1');

      http.expectOne(LIST_URL).flush(SEED);
      await stable();
      expect(cards()).toHaveLength(3);
    });
  });

  describe('empty', () => {
    it('guides the creation of the first portfolio, without the "Nova carteira" button', async () => {
      const { element, button } = await open([]);

      expect(element.querySelector('h2')?.textContent?.trim()).toBe('Você ainda não tem carteiras');
      expect(button('Nova carteira')).toBeUndefined();
      expect(button('Cancelar')).toBeUndefined();
      const input = element.querySelector('#portfolio-name') as HTMLInputElement;
      expect(element.querySelector('label[for="portfolio-name"]')?.textContent?.trim()).toBe(
        'Nome da carteira',
      );
      expect(input.placeholder).toBe('Ex.: Longo prazo');
    });

    it('creates the first portfolio and shows it in the list (RN02)', async () => {
      const { stable, button, type, cards } = await open([]);
      await type('portfolio-name', 'Longo prazo');

      button('Criar carteira').click();
      await stable();
      expect(button('Criar carteira').disabled).toBe(true);
      expect(button('Criar carteira').getAttribute('aria-busy')).toBe('true');

      const request = http.expectOne({ method: 'POST', url: LIST_URL });
      expect(request.request.body).toEqual({ name: 'Longo prazo' });
      request.flush(portfolio({ operationCount: 0, assetCount: 0, lastTradeDate: null }), {
        status: 201,
        statusText: 'Created',
      });
      await stable();

      expect(cards()).toEqual(['Longo prazo Sem operações ainda']);
      expect(document.activeElement?.id).toBe('portfolio-p1');
    });

    it('asks for a name before sending (RN02) and focuses the field', async () => {
      const { stable, button, hint } = await open([]);

      button('Criar carteira').click();
      await stable();

      expect(hint()).toBe('Dê um nome à carteira.');
      expect(document.activeElement?.id).toBe('portfolio-name');
      http.expectNone({ method: 'POST', url: LIST_URL });
    });
  });

  describe('create', () => {
    const openPanel = async () => {
      const page = await open();
      page.button('Nova carteira').click();
      await page.stable();
      return page;
    };

    it('"Nova carteira" opens the panel with the focus in the name, and "Cancelar" closes it', async () => {
      const { element, stable, button } = await openPanel();

      expect(element.querySelector('#new-portfolio-title')?.textContent?.trim()).toBe(
        'Nova carteira',
      );
      expect(document.activeElement?.id).toBe('portfolio-name');

      button('Cancelar').click();
      await stable();
      expect(element.querySelector('#portfolio-name')).toBeNull();
    });

    it('shows a repeated name (409 ALREADY_EXISTS) in the field and keeps the panel (RN02)', async () => {
      const { stable, button, type, hint, element } = await openPanel();
      await type('portfolio-name', 'Longo prazo');
      button('Criar carteira').click();
      await stable();

      http.expectOne({ method: 'POST', url: LIST_URL }).flush(
        problem(409, {
          errors: [{ field: 'name', code: 'ALREADY_EXISTS', message: 'name already exists' }],
        }),
        { status: 409, statusText: 'Conflict' },
      );
      await stable();

      const input = element.querySelector('#portfolio-name') as HTMLInputElement;
      expect(hint()).toBe('Você já tem uma carteira com este nome. Escolha outro.');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.value).toBe('Longo prazo');
      expect(document.activeElement).toBe(input);
      expect(button('Criar carteira').disabled).toBe(false);
      expect(handleError).not.toHaveBeenCalled();
    });

    it('shows a too long name (400 TOO_LONG) with the limit from params (D56)', async () => {
      const { stable, button, type, hint } = await openPanel();
      await type('portfolio-name', 'x'.repeat(151));
      button('Criar carteira').click();
      await stable();

      http.expectOne({ method: 'POST', url: LIST_URL }).flush(
        problem(400, {
          errors: [{ field: 'name', code: 'TOO_LONG', message: 'too long', params: { max: 150 } }],
        }),
        { status: 400, statusText: 'Bad Request' },
      );
      await stable();

      expect(hint()).toBe('Use até 150 caracteres.');
    });

    it('adds the new portfolio at the end and closes the panel', async () => {
      const { element, stable, button, type, cards } = await openPanel();
      await type('portfolio-name', 'Aposentadoria');
      button('Criar carteira').click();
      await stable();

      http
        .expectOne({ method: 'POST', url: LIST_URL })
        .flush(portfolio({ id: 'p4', name: 'Aposentadoria', operationCount: 0, assetCount: 0 }));
      await stable();

      expect(cards().at(-1)).toBe('Aposentadoria Sem operações ainda');
      expect(element.querySelector('#portfolio-name')).toBeNull();
    });

    it('reports an unexpected failure and leaves a connection failure to the shell banner', async () => {
      const { stable, button, type } = await openPanel();
      await type('portfolio-name', 'Aposentadoria');

      button('Criar carteira').click();
      await stable();
      http.expectOne(LIST_URL).flush(problem(500), { status: 500, statusText: 'Error' });
      await stable();
      expect(handleError).toHaveBeenCalledTimes(1);

      button('Criar carteira').click();
      await stable();
      http.expectOne(LIST_URL).error(new ProgressEvent('error'), { status: 0 });
      await stable();
      expect(handleError).toHaveBeenCalledTimes(1);
      expect(button('Criar carteira').disabled).toBe(false);
    });
  });

  describe('delete (ConfirmDialog, C3)', () => {
    const openDialog = async (name = 'Longo prazo') => {
      const page = await open();
      page.button(`Excluir carteira ${name}`).click();
      await page.stable();
      const dialog = page.element.querySelector('dialog') as HTMLDialogElement;
      const confirm = () => page.button('Excluir carteira');
      return { ...page, dialog, confirm };
    };

    it('says how many operations are deleted and enables "Excluir carteira" only with the name typed', async () => {
      const { dialog, confirm, type } = await openDialog();

      expect(dialog.textContent).toContain('Excluir a carteira “Longo prazo”?');
      expect(dialog.textContent).toContain(
        'Isto apaga a carteira e as 11 operações lançadas nela.',
      );
      expect(document.activeElement?.id).toBe('confirm-dialog-input');
      expect(confirm().disabled).toBe(true);

      await type('confirm-dialog-input', 'Dividendos');
      expect(confirm().disabled).toBe(true);
      await type('confirm-dialog-input', 'Longo prazo');
      expect(confirm().disabled).toBe(false);
    });

    it('deletes the portfolio and its card, with the focus back on the title', async () => {
      const { element, stable, confirm, type, cards } = await openDialog();
      await type('confirm-dialog-input', 'Longo prazo');

      confirm().click();
      await stable();
      expect(confirm().getAttribute('aria-busy')).toBe('true');

      http
        .expectOne({ method: 'DELETE', url: `${LIST_URL}/p1` })
        .flush(null, { status: 204, statusText: 'No Content' });
      await stable();

      expect(element.querySelector('dialog')).toBeNull();
      expect(cards()).toEqual([
        'Dividendos 3 ativos · 6 operações',
        'Testes FII Sem operações ainda',
      ]);
      expect(document.activeElement?.tagName).toBe('H1');
    });

    it('treats a 404 as already deleted (another tab) and updates the list', async () => {
      const { stable, confirm, type, cards } = await openDialog('Testes FII');
      await type('confirm-dialog-input', 'Testes FII');

      confirm().click();
      await stable();
      http
        .expectOne(`${LIST_URL}/p3`)
        .flush(problem(404), { status: 404, statusText: 'Not Found' });
      await stable();

      expect(cards()).toHaveLength(2);
      expect(handleError).not.toHaveBeenCalled();
    });

    it('keeps the dialog open on an unexpected failure and reports it', async () => {
      const { element, stable, confirm, type, cards } = await openDialog();
      await type('confirm-dialog-input', 'Longo prazo');

      confirm().click();
      await stable();
      http.expectOne(`${LIST_URL}/p1`).flush(problem(500), { status: 500, statusText: 'Error' });
      await stable();

      expect(element.querySelector('dialog')).not.toBeNull();
      expect(confirm().disabled).toBe(false);
      expect(handleError).toHaveBeenCalledTimes(1);
      expect(cards()).toHaveLength(3);
    });

    it('"Cancelar" closes without deleting', async () => {
      const { element, stable, button, cards } = await openDialog();

      button('Cancelar').click();
      await stable();

      expect(element.querySelector('dialog')).toBeNull();
      expect(cards()).toHaveLength(3);
      http.expectNone({ method: 'DELETE' });
    });
  });
});
