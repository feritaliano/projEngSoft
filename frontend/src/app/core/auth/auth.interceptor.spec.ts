import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../api/api-configuration';
import { AuthResponseDto } from '../../api/models';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

const API = 'http://api.test';
const PORTFOLIOS = `${API}/api/v1/portfolios`;
const ASSETS = `${API}/api/v1/assets`;
const REFRESH = `${API}/api/v1/auth/refresh`;
const session = (accessToken: string): AuthResponseDto => ({
  accessToken,
  tokenType: 'Bearer',
  expiresIn: 900,
  user: { id: 'u1', name: 'Ana Lima', email: 'ana.lima@email.com' },
});
const unauthorized = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration(API),
        provideRouter([]),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth.start(session('old'));
  });

  afterEach(() => http.verify());

  it('sends the access token and the credentials to the API', () => {
    client.get(PORTFOLIOS).subscribe();

    const req = http.expectOne(PORTFOLIOS);
    expect(req.request.headers.get('Authorization')).toBe('Bearer old');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('sends the refresh cookie but no token to the auth routes', () => {
    client.post(`${API}/api/v1/auth/login`, {}).subscribe();

    const req = http.expectOne(`${API}/api/v1/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(true);
    req.flush(session('new'));
  });

  it('leaves requests to other origins untouched', () => {
    client.get('https://example.org/data').subscribe();

    const req = http.expectOne('https://example.org/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(false);
    req.flush({});
  });

  it('on 401 refreshes once for two simultaneous requests and repeats both with the new token (D39)', () => {
    const results: unknown[] = [];
    client.get(PORTFOLIOS).subscribe((body) => results.push(body));
    client.get(ASSETS).subscribe((body) => results.push(body));

    http.expectOne(PORTFOLIOS).flush(null, unauthorized);
    http.expectOne(ASSETS).flush(null, unauthorized);
    http.expectOne(REFRESH).flush(session('new'));

    const retries = [http.expectOne(PORTFOLIOS), http.expectOne(ASSETS)];
    for (const retry of retries) {
      expect(retry.request.headers.get('Authorization')).toBe('Bearer new');
    }
    retries[0].flush(['portfolios']);
    retries[1].flush(['assets']);
    expect(results).toEqual([['portfolios'], ['assets']]);
  });

  it('when the refresh is refused (401), ends the session and goes to the login', () => {
    const expire = vi.spyOn(auth, 'expire').mockImplementation(() => undefined);
    let status: number | undefined;
    client.get(PORTFOLIOS).subscribe({ error: (error) => (status = error.status) });

    http.expectOne(PORTFOLIOS).flush(null, unauthorized);
    http.expectOne(REFRESH).flush({ title: 'Unauthorized', status: 401 }, unauthorized);

    expect(expire).toHaveBeenCalledTimes(1);
    expect(status).toBe(401);
  });

  it('does not end the session when the refresh fails for lack of connection', () => {
    const expire = vi.spyOn(auth, 'expire').mockImplementation(() => undefined);
    let status: number | undefined;
    client.get(PORTFOLIOS).subscribe({ error: (error) => (status = error.status) });

    http.expectOne(PORTFOLIOS).flush(null, unauthorized);
    http.expectOne(REFRESH).error(new ProgressEvent('error'));

    expect(expire).not.toHaveBeenCalled();
    expect(status).toBe(0);
  });

  it('does not refresh on a 401 from the auth routes (wrong password)', () => {
    let status: number | undefined;
    client
      .post(`${API}/api/v1/auth/login`, {})
      .subscribe({ error: (error) => (status = error.status) });

    http.expectOne(`${API}/api/v1/auth/login`).flush(null, unauthorized);

    http.expectNone(REFRESH);
    expect(status).toBe(401);
  });

  it('passes other errors through without refreshing', () => {
    let status: number | undefined;
    client.get(PORTFOLIOS).subscribe({ error: (error) => (status = error.status) });

    http.expectOne(PORTFOLIOS).flush(null, { status: 404, statusText: 'Not Found' });

    http.expectNone(REFRESH);
    expect(status).toBe(404);
  });
});
