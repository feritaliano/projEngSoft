import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideApiConfiguration } from '../../api/api-configuration';
import { ConnectionService } from '../http/connection.service';
import { AUTO_RETRY_INTERVAL_MS, ConnectionBanner } from './connection-banner';

describe('ConnectionBanner', () => {
  let connection: ConnectionService;
  let retry: ReturnType<typeof vi.spyOn>;

  const render = async () => {
    const fixture = TestBed.createComponent(ConnectionBanner);
    await fixture.whenStable();
    return fixture;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideApiConfiguration('http://api.test')],
    });
    connection = TestBed.inject(ConnectionService);
    retry = vi.spyOn(connection, 'retry').mockImplementation(() => undefined);
  });

  afterEach(() => vi.useRealTimers());

  it('shows nothing while the server is reachable', async () => {
    const fixture = await render();

    expect(fixture.nativeElement.querySelector('[role="status"]').textContent.trim()).toBe('');
  });

  it('shows the connection failure in a status region when the server is unreachable', async () => {
    connection.markOffline();
    const fixture = await render();

    const status: HTMLElement = fixture.nativeElement.querySelector('[role="status"]');
    expect(status.textContent).toContain('Sem conexão com o servidor.');
    expect(status.textContent).toContain('O que você já salvou não foi perdido.');
  });

  it('"Tentar agora" retries right away', async () => {
    connection.markOffline();
    const fixture = await render();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.textContent?.trim()).toBe('Tentar agora');
    button.click();

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('retries automatically while offline and stops when the connection is back', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    connection.markOffline();
    const fixture = await render();

    vi.advanceTimersByTime(AUTO_RETRY_INTERVAL_MS * 2);
    expect(retry).toHaveBeenCalledTimes(2);

    connection.markOnline();
    fixture.detectChanges();
    vi.advanceTimersByTime(AUTO_RETRY_INTERVAL_MS * 2);
    expect(retry).toHaveBeenCalledTimes(2);
  });
});
