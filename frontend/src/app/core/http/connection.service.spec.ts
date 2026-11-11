import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfiguration } from '../../api/api-configuration';
import { ConnectionService } from './connection.service';
import { errorInterceptor } from './error.interceptor';

const HEALTH = 'http://api.test/api/v1/health';

describe('ConnectionService', () => {
  let connection: ConnectionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    connection = TestBed.inject(ConnectionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts online and follows markOffline / markOnline', () => {
    expect(connection.offline()).toBe(false);
    connection.markOffline();
    expect(connection.offline()).toBe(true);
    connection.markOnline();
    expect(connection.offline()).toBe(false);
  });

  it('retry pings the health check and goes back online when the server answers', () => {
    connection.markOffline();

    connection.retry();
    http.expectOne(HEALTH).flush({ status: 'ok' });

    expect(connection.offline()).toBe(false);
  });

  it('retry stays offline while the server is unreachable', () => {
    connection.markOffline();

    connection.retry();
    http.expectOne(HEALTH).error(new ProgressEvent('error'));

    expect(connection.offline()).toBe(true);
  });

  it('a 503 from the health check (database down) still means the server is reachable', () => {
    connection.markOffline();

    connection.retry();
    http
      .expectOne(HEALTH)
      .flush({ status: 503 }, { status: 503, statusText: 'Service Unavailable' });

    expect(connection.offline()).toBe(false);
  });
});
