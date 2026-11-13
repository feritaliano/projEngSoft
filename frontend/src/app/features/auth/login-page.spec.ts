import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../api/api-configuration';
import { AuthResponseDto } from '../../api/models';
import { AuthService } from '../../core/auth/auth.service';
import { ConnectionService } from '../../core/http/connection.service';
import { LoginPage } from './login-page';

const API = 'http://api.test';
const LOGIN_URL = `${API}/api/v1/auth/login`;
const SESSION: AuthResponseDto = {
  accessToken: 't1',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: { id: 'u1', name: 'Ana Lima', email: 'ana.lima@email.com' },
};
const problem = (status: number, extra: object = {}) => ({
  type: 'about:blank',
  title: 'Error',
  status,
  ...extra,
});

@Component({ template: '' })
class PortfoliosStub {}

describe('LoginPage', () => {
  let http: HttpTestingController;
  let handleError: ReturnType<typeof vi.fn>;

  const open = async (url = '/entrar') => {
    const harness = await RouterTestingHarness.create(url);
    const element: HTMLElement = harness.routeNativeElement as HTMLElement;
    const field = (id: string) =>
      element.querySelector<HTMLInputElement>(`#${id}`) as HTMLInputElement;
    const type = (id: string, value: string) => {
      field(id).value = value;
      field(id).dispatchEvent(new Event('input'));
    };
    const submitButton = () => element.querySelector('button[type="submit"]') as HTMLButtonElement;
    const submit = async () => {
      submitButton().click();
      await harness.fixture.whenStable();
    };
    const hint = (id: string) => element.querySelector(`#${id}-hint`)?.textContent?.trim();
    return { harness, element, field, type, submit, submitButton, hint };
  };

  beforeEach(() => {
    handleError = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(API),
        provideRouter([
          { path: 'entrar', component: LoginPage },
          { path: 'carteiras', component: PortfoliosStub },
        ]),
        { provide: ErrorHandler, useValue: { handleError } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows the default state: title, e-mail, password, "Entrar" and the link to sign up', async () => {
    const { element, field, submitButton } = await open();

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Entrar');
    expect(field('email').type).toBe('email');
    expect(field('password').type).toBe('password');
    expect(submitButton().textContent?.trim()).toBe('Entrar');
    expect(element.querySelector('a[href="/cadastro"]')?.textContent?.trim()).toBe('Criar conta');
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.textContent).not.toContain('Sua sessão expirou.');
  });

  it('shows the expired-session notice when the refresh was refused', async () => {
    const { element } = await open('/entrar?sessao=expirada');

    expect(element.querySelector('[role="status"]:not(:empty)')?.textContent).toContain(
      'Sua sessão expirou.',
    );
    expect(element.textContent).toContain('Nada do que você salvou foi perdido.');
  });

  it('checks the fields before sending (RN01) and focuses the first invalid one', async () => {
    const { submit, hint } = await open();

    await submit();

    expect(hint('email')).toBe('Informe seu e-mail.');
    expect(hint('password')).toBe('Informe sua senha.');
    expect(document.activeElement?.id).toBe('email');
    http.expectNone(LOGIN_URL);
  });

  it('shows the loading state while signing in, then opens the portfolios', async () => {
    const { harness, field, type, submit, submitButton } = await open();
    type('email', 'ana.lima@email.com');
    type('password', 'segredo-123');

    await submit();

    expect(submitButton().textContent?.trim()).toBe('Entrando…');
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().getAttribute('aria-busy')).toBe('true');
    expect(field('email').disabled).toBe(true);
    expect(field('password').disabled).toBe(true);

    const request = http.expectOne({ method: 'POST', url: LOGIN_URL });
    expect(request.request.body).toEqual({ email: 'ana.lima@email.com', password: 'segredo-123' });
    request.flush(SESSION);
    await harness.fixture.whenStable();

    expect(TestBed.inject(AuthService).accessToken()).toBe('t1');
    expect(TestBed.inject(Router).url).toBe('/carteiras');
  });

  it('on 401 shows the invalid-credentials notice, keeps the e-mail and clears the password', async () => {
    const { harness, element, field, type, submit, submitButton } =
      await open('/entrar?sessao=expirada');
    type('email', 'ana.lima@email.com');
    type('password', 'errada-123');
    await submit();

    http.expectOne(LOGIN_URL).flush(problem(401), { status: 401, statusText: 'Unauthorized' });
    await harness.fixture.whenStable();

    const alert = element.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('E-mail ou senha incorretos.');
    expect(alert?.textContent).toContain('Depois de 5 tentativas, aguarde 1 minuto.');
    expect(element.textContent).not.toContain('Sua sessão expirou.');
    expect(field('email').value).toBe('ana.lima@email.com');
    expect(field('password').value).toBe('');
    expect(document.activeElement?.id).toBe('password');
    expect(field('password').getAttribute('aria-invalid')).toBeNull();
    expect(submitButton().disabled).toBe(false);
    expect(handleError).not.toHaveBeenCalled();
  });

  it('shows the 400 errors under their fields by field + code (D56)', async () => {
    const { harness, field, type, submit, hint } = await open();
    type('email', 'ana@email');
    type('password', 'x');
    await submit();

    http.expectOne(LOGIN_URL).flush(
      problem(400, {
        errors: [{ field: 'email', code: 'INVALID_FORMAT', message: 'email must be an email' }],
      }),
      { status: 400, statusText: 'Bad Request' },
    );
    await harness.fixture.whenStable();

    expect(hint('email')).toBe('Informe um e-mail válido, como nome@exemplo.com.');
    expect(field('email').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement?.id).toBe('email');
    expect(hint('password')).toBeUndefined();
  });

  it('leaves a connection failure to the shell banner', async () => {
    const { harness, type, submit, submitButton } = await open();
    type('email', 'ana.lima@email.com');
    type('password', 'segredo-123');
    await submit();

    http.expectOne(LOGIN_URL).error(new ProgressEvent('error'), { status: 0 });
    await harness.fixture.whenStable();

    expect(handleError).not.toHaveBeenCalled();
    expect(submitButton().disabled).toBe(false);
    expect(TestBed.inject(ConnectionService).offline()).toBe(false); // no error interceptor in this spec
  });

  it('reports a 429 or 5xx, which have no text yet, and lets the user try again', async () => {
    const { harness, element, type, submit, submitButton } = await open();
    type('email', 'ana.lima@email.com');
    type('password', 'segredo-123');
    await submit();

    http.expectOne(LOGIN_URL).flush(problem(429), { status: 429, statusText: 'Too Many Requests' });
    await harness.fixture.whenStable();

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(submitButton().disabled).toBe(false);
  });
});
