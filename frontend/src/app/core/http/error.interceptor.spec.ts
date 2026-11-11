import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ConnectionService } from './connection.service';
import { errorInterceptor, problemOf } from './error.interceptor';

const URL = 'http://api.test/api/v1/portfolios';

describe('errorInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let connection: ConnectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    connection = TestBed.inject(ConnectionService);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('status 0 turns on the connection failure and the error reaches the caller', () => {
    let status: number | undefined;
    client.get(URL).subscribe({ error: (error: HttpErrorResponse) => (status = error.status) });

    http.expectOne(URL).error(new ProgressEvent('error'));

    expect(connection.offline()).toBe(true);
    expect(status).toBe(0);
  });

  it('a response turns the connection failure off', () => {
    connection.markOffline();
    client.get(URL).subscribe();

    http.expectOne(URL).flush([]);

    expect(connection.offline()).toBe(false);
  });

  it('an HTTP error (404) means the server answered: no connection failure, error with problem+json', () => {
    connection.markOffline();
    let error: unknown;
    client.get(URL).subscribe({ error: (e: unknown) => (error = e) });

    const problem = { type: 'about:blank', title: 'Not Found', status: 404 };
    http.expectOne(URL).flush(problem, { status: 404, statusText: 'Not Found' });

    expect(connection.offline()).toBe(false);
    expect(problemOf(error)).toEqual(problem);
  });

  it('10 s without a response turns on the connection failure (handoff U5)', () => {
    vi.useFakeTimers();
    let status: number | undefined;
    client.get(URL).subscribe({ error: (error: HttpErrorResponse) => (status = error.status) });
    const req = http.expectOne(URL);

    vi.advanceTimersByTime(9_999);
    expect(req.cancelled).toBe(false);
    expect(connection.offline()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(req.cancelled).toBe(true);
    expect(connection.offline()).toBe(true);
    expect(status).toBe(0);
  });
});

describe('problemOf', () => {
  it('returns null when the error has no problem+json body', () => {
    expect(problemOf(new HttpErrorResponse({ status: 0 }))).toBeNull();
    expect(problemOf(new HttpErrorResponse({ status: 500, error: 'Internal error' }))).toBeNull();
    expect(problemOf(new Error('boom'))).toBeNull();
  });

  it('returns the field errors of a 400 (D56)', () => {
    const body = {
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      errors: [{ field: 'email', code: 'REQUIRED', message: 'email is required' }],
    };

    expect(problemOf(new HttpErrorResponse({ status: 400, error: body }))?.errors?.[0].code).toBe(
      'REQUIRED',
    );
  });
});
