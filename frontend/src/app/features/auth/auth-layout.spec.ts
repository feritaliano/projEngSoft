import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideApiConfiguration } from '../../api/api-configuration';
import { ConnectionService } from '../../core/http/connection.service';
import { AuthLayout } from './auth-layout';

describe('AuthLayout', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideApiConfiguration('http://api.test')],
    });
  });

  it('shows the brand, the title and lead of the card, the footer note and the connection banner', async () => {
    TestBed.inject(ConnectionService).markOffline();
    vi.spyOn(TestBed.inject(ConnectionService), 'retry').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(AuthLayout);
    fixture.componentRef.setInput('heading', 'Entrar');
    fixture.componentRef.setInput('lead', 'Acompanhe sua carteira.');
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('main')).toBeTruthy();
    expect(element.textContent).toContain('Carteira B3');
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Entrar');
    expect(element.querySelector('h1 + p')?.textContent?.trim()).toBe('Acompanhe sua carteira.');
    expect(element.textContent).toContain('Não recomenda compra ou venda de ativos.');
    expect(element.textContent).toContain('Sem conexão com o servidor.');
    fixture.destroy();
  });
});
