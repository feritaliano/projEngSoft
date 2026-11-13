import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../api/api-configuration';
import { AuthResponseDto } from '../../api/models';
import { AuthService } from '../../core/auth/auth.service';
import { RegisterPage } from './register-page';

const API = 'http://api.test';
const REGISTER_URL = `${API}/api/v1/auth/register`;
const SESSION: AuthResponseDto = {
  accessToken: 't1',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: { id: 'u1', name: 'Ana Lima', email: 'ana.lima@email.com' },
};

@Component({ template: '' })
class PortfoliosStub {}

describe('RegisterPage', () => {
  let http: HttpTestingController;
  let handleError: ReturnType<typeof vi.fn>;

  const open = async () => {
    const harness = await RouterTestingHarness.create('/cadastro');
    const element: HTMLElement = harness.routeNativeElement as HTMLElement;
    const field = (id: string) =>
      element.querySelector<HTMLInputElement>(`#${id}`) as HTMLInputElement;
    const type = (id: string, value: string) => {
      field(id).value = value;
      field(id).dispatchEvent(new Event('input'));
    };
    const blur = async (id: string) => {
      field(id).dispatchEvent(new Event('blur'));
      await harness.fixture.whenStable();
    };
    const submitButton = () => element.querySelector('button[type="submit"]') as HTMLButtonElement;
    const submit = async () => {
      submitButton().click();
      await harness.fixture.whenStable();
    };
    const fillValid = () => {
      type('name', 'Ana Lima');
      type('email', 'ana.lima@email.com');
      type('password', 'segredo-123');
    };
    const hint = (id: string) => element.querySelector(`#${id}-hint`)?.textContent?.trim();
    return { harness, element, field, type, blur, submit, submitButton, fillValid, hint };
  };

  beforeEach(() => {
    handleError = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(API),
        provideRouter([
          { path: 'cadastro', component: RegisterPage },
          { path: 'carteiras', component: PortfoliosStub },
        ]),
        { provide: ErrorHandler, useValue: { handleError } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows the default state with the RN01 minimum as the password helper, before any error', async () => {
    const { element, field, submitButton, hint } = await open();

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Criar conta');
    expect(field('name')).toBeTruthy();
    expect(field('email').type).toBe('email');
    expect(field('password').autocomplete).toBe('new-password');
    expect(hint('password')).toBe('Mínimo de 8 caracteres.');
    expect(field('password').getAttribute('aria-invalid')).toBeNull();
    expect(submitButton().textContent?.trim()).toBe('Criar conta');
    expect(element.querySelector('a[href="/entrar"]')?.textContent?.trim()).toBe('Entrar');
  });

  it('shows a short password after leaving the field, with the characters missing (RN01)', async () => {
    const { type, blur, hint, field } = await open();
    type('password', 'abcde');

    expect(hint('password')).toBe('Mínimo de 8 caracteres.');
    await blur('password');

    expect(hint('password')).toBe('A senha precisa de pelo menos 8 caracteres. Faltam 3.');
    expect(field('password').getAttribute('aria-invalid')).toBe('true');
  });

  it('checks every field before sending and focuses the first invalid one (RN01)', async () => {
    const { submit, hint } = await open();

    await submit();

    expect(hint('name')).toBe('Informe seu nome.');
    expect(hint('email')).toBe('Informe seu e-mail.');
    expect(hint('password')).toBe('Crie uma senha com pelo menos 8 caracteres.');
    expect(document.activeElement?.id).toBe('name');
    http.expectNone(REGISTER_URL);
  });

  it('shows the loading state, then enters signed in on the portfolios', async () => {
    const { harness, field, fillValid, submit, submitButton } = await open();
    fillValid();

    await submit();

    expect(submitButton().textContent?.trim()).toBe('Criando conta…');
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().getAttribute('aria-busy')).toBe('true');
    expect(field('name').disabled).toBe(true);

    const request = http.expectOne({ method: 'POST', url: REGISTER_URL });
    expect(request.request.body).toEqual({
      name: 'Ana Lima',
      email: 'ana.lima@email.com',
      password: 'segredo-123',
    });
    request.flush(SESSION, { status: 201, statusText: 'Created' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(AuthService).accessToken()).toBe('t1');
    expect(TestBed.inject(Router).url).toBe('/carteiras');
  });

  it('shows the 409 of a registered e-mail in the e-mail field, until the e-mail changes', async () => {
    const { harness, field, type, fillValid, submit, submitButton, hint } = await open();
    fillValid();
    await submit();

    http.expectOne(REGISTER_URL).flush(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: 409,
        field: 'email',
        errors: [{ field: 'email', code: 'ALREADY_EXISTS', message: 'email already registered' }],
      },
      { status: 409, statusText: 'Conflict' },
    );
    await harness.fixture.whenStable();

    expect(hint('email')).toBe('Já existe uma conta com este e-mail. Entre ou use outro e-mail.');
    expect(field('email').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement?.id).toBe('email');
    expect(submitButton().disabled).toBe(false);
    expect(handleError).not.toHaveBeenCalled();

    type('email', 'outra@email.com');
    await harness.fixture.whenStable();
    expect(hint('email')).toBeUndefined();
  });

  it('shows each 400 error under its field with the params of the API (D56)', async () => {
    const { harness, fillValid, submit, hint } = await open();
    fillValid();
    await submit();

    http.expectOne(REGISTER_URL).flush(
      {
        type: 'about:blank',
        title: 'Bad Request',
        status: 400,
        errors: [
          { field: 'name', code: 'TOO_LONG', message: 'too long', params: { max: 150 } },
          { field: 'password', code: 'TOO_LONG', message: 'too long', params: { max: 128 } },
        ],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await harness.fixture.whenStable();

    expect(hint('name')).toBe('Use até 150 caracteres.');
    expect(hint('password')).toBe('Use até 128 caracteres.');
    expect(document.activeElement?.id).toBe('name');
  });

  it('reports a 429 or 5xx, which have no text yet, and lets the user try again', async () => {
    const { harness, fillValid, submit, submitButton } = await open();
    fillValid();
    await submit();

    http
      .expectOne(REGISTER_URL)
      .flush(
        { type: 'about:blank', title: 'Error', status: 500 },
        { status: 500, statusText: 'Error' },
      );
    await harness.fixture.whenStable();

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(submitButton().disabled).toBe(false);
  });

  it('leaves a connection failure to the shell banner', async () => {
    const { harness, fillValid, submit } = await open();
    fillValid();
    await submit();

    http.expectOne(REGISTER_URL).error(new ProgressEvent('error'), { status: 0 });
    await harness.fixture.whenStable();

    expect(handleError).not.toHaveBeenCalled();
  });
});
