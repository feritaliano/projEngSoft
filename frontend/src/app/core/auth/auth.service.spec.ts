import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../api/api-configuration';
import { AuthResponseDto } from '../../api/models';
import { AuthService, REFRESH_LOCK } from './auth.service';

const API = 'http://api.test';
const session = (accessToken: string): AuthResponseDto => ({
  accessToken,
  tokenType: 'Bearer',
  expiresIn: 900,
  user: { id: 'u1', name: 'Ana Lima', email: 'ana.lima@email.com' },
});

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(API),
        provideRouter([]),
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });

  it('starts signed out and keeps the session given by login or register', () => {
    expect(auth.accessToken()).toBeNull();

    auth.start(session('t1'));

    expect(auth.accessToken()).toBe('t1');
    expect(auth.user()?.name).toBe('Ana Lima');
  });

  it('refresh stores the new session and emits the new access token', () => {
    let token: string | undefined;
    auth.refresh().subscribe((value) => (token = value));

    http.expectOne({ method: 'POST', url: `${API}/api/v1/auth/refresh` }).flush(session('t2'));

    expect(token).toBe('t2');
    expect(auth.accessToken()).toBe('t2');
  });

  it('shares one refresh request between concurrent callers (D39)', () => {
    const tokens: string[] = [];
    auth.refresh().subscribe((value) => tokens.push(value));
    auth.refresh().subscribe((value) => tokens.push(value));

    http.expectOne(`${API}/api/v1/auth/refresh`).flush(session('t2'));

    expect(tokens).toEqual(['t2', 't2']);
  });

  it('starts a new refresh after the previous one finished', () => {
    auth.refresh().subscribe();
    http.expectOne(`${API}/api/v1/auth/refresh`).flush(session('t2'));

    auth.refresh().subscribe();
    http.expectOne(`${API}/api/v1/auth/refresh`).flush(session('t3'));

    expect(auth.accessToken()).toBe('t3');
  });

  it('a refused refresh (401) ends the session', () => {
    auth.start(session('t1'));
    let failed = false;
    auth.refresh().subscribe({ error: () => (failed = true) });

    http
      .expectOne(`${API}/api/v1/auth/refresh`)
      .flush({ title: 'Unauthorized', status: 401 }, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(auth.accessToken()).toBeNull();
  });

  it('a refresh without connection keeps the session', () => {
    auth.start(session('t1'));
    auth.refresh().subscribe({ error: () => undefined });

    http.expectOne(`${API}/api/v1/auth/refresh`).error(new ProgressEvent('error'));

    expect(auth.accessToken()).toBe('t1');
  });

  it('expire clears the session and opens the login with the expired-session notice', () => {
    auth.start(session('t1'));

    auth.expire();

    expect(auth.accessToken()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/entrar'], { queryParams: { sessao: 'expirada' } });
  });

  it('logout revokes the session on the API and goes to the login', () => {
    auth.start(session('t1'));

    auth.logout();
    http
      .expectOne({ method: 'POST', url: `${API}/api/v1/auth/logout` })
      .flush(null, { status: 204, statusText: 'No Content' });

    expect(auth.accessToken()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/entrar']);
  });

  it('logout without connection keeps the session so the user can try again', () => {
    auth.start(session('t1'));

    auth.logout();
    http.expectOne(`${API}/api/v1/auth/logout`).error(new ProgressEvent('error'));

    expect(auth.accessToken()).toBe('t1');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('logout answered with an error (500) still ends the session: the API already cleared the cookie', () => {
    auth.start(session('t1'));

    auth.logout();
    http
      .expectOne(`${API}/api/v1/auth/logout`)
      .flush(null, { status: 500, statusText: 'Internal Server Error' });

    expect(auth.accessToken()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/entrar']);
  });

  it('serializes the refresh across tabs with a Web Lock (D39)', async () => {
    const request = vi.fn((_name: string, callback: () => Promise<unknown>) => callback());
    vi.stubGlobal('navigator', { ...navigator, locks: { request } });
    let token: string | undefined;
    auth.refresh().subscribe((value) => (token = value));

    expect(request).toHaveBeenCalledWith(REFRESH_LOCK, expect.any(Function));
    http.expectOne(`${API}/api/v1/auth/refresh`).flush(session('t2'));
    await vi.waitFor(() => expect(token).toBe('t2'));
  });
});
