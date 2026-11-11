import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ApplicationInitStatus, ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../environments/environment';
import { appConfig } from './app.config';
import { AuthService } from './core/auth/auth.service';

const REFRESH = `${environment.apiRootUrl}/api/v1/auth/refresh`;

describe('App (routes and startup)', () => {
  let http: HttpTestingController;

  let reported: ReturnType<typeof vi.fn>;

  const boot = async (refresh: 'session' | 'none' | 'offline' | 'server-error') => {
    reported = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        provideHttpClientTesting(),
        { provide: ErrorHandler, useValue: { handleError: reported } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const init = TestBed.inject(ApplicationInitStatus).donePromise;
    const req = http.expectOne(REFRESH);
    if (refresh === 'session') {
      req.flush({
        accessToken: 't1',
        tokenType: 'Bearer',
        expiresIn: 900,
        user: { id: 'u1', name: 'Ana Lima', email: 'ana.lima@email.com' },
      });
    } else if (refresh === 'none') {
      req.flush(
        { title: 'Unauthorized', status: 401 },
        { status: 401, statusText: 'Unauthorized' },
      );
    } else if (refresh === 'offline') {
      req.error(new ProgressEvent('error'));
    } else {
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });
    }
    await init;
    return RouterTestingHarness.create();
  };

  afterEach(() => http.verify());

  it('restores the session from the refresh cookie at startup', async () => {
    await boot('session');

    expect(TestBed.inject(AuthService).user()?.name).toBe('Ana Lima');
  });

  it('starts signed out when there is no session, and protected pages go to the login', async () => {
    const harness = await boot('none');

    await harness.navigateByUrl('/carteiras');

    expect(TestBed.inject(Router).url).toBe('/entrar');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe('Entrar');
  });

  it('starts with the connection failure when the server is unreachable', async () => {
    const harness = await boot('offline');

    await harness.navigateByUrl('/carteiras');

    expect(TestBed.inject(Router).url).toBe('/entrar');
    expect(harness.routeNativeElement?.textContent).toContain('Sem conexão com o servidor.');
    expect(reported).not.toHaveBeenCalled();
  });

  it('starts signed out and reports an unexpected refresh failure (500)', async () => {
    await boot('server-error');

    expect(TestBed.inject(AuthService).accessToken()).toBeNull();
    expect(reported).toHaveBeenCalledTimes(1);
  });

  it('opens Carteiras by default for a signed-in user, inside the shell', async () => {
    const harness = await boot('session');

    await harness.navigateByUrl('/');

    expect(TestBed.inject(Router).url).toBe('/carteiras');
    expect(harness.routeNativeElement?.querySelector('header nav')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe(
      'Suas carteiras',
    );
  });

  it('shows the 404 page inside the shell for an unknown address', async () => {
    const harness = await boot('none');

    await harness.navigateByUrl('/endereco-que-nao-existe');

    expect(harness.routeNativeElement?.querySelector('header nav')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe(
      'Página não encontrada',
    );
    expect(document.title).toBe('Página não encontrada · Carteira B3');
  });
});
