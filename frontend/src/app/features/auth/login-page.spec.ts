import { provideHttpClient } from '@angular/common/http';
import { provideApiConfiguration } from '../../api/api-configuration';
import { TestBed } from '@angular/core/testing';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  it('shows the page title', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideApiConfiguration('http://api.test')],
    });
    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('Entrar');
  });
});
