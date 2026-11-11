import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../api/api-configuration';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  const run = () =>
    TestBed.runInInjectionContext(() => authGuard({} as never, {} as never)) as boolean | UrlTree;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideApiConfiguration('http://api.test'),
        provideRouter([]),
      ],
    });
  });

  it('lets a signed-in user through', () => {
    TestBed.inject(AuthService).start({
      accessToken: 't1',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: 'u1', name: 'Ana Lima', email: 'ana.lima@email.com' },
    });

    expect(run()).toBe(true);
  });

  it('sends a signed-out user to the login', () => {
    const result = run();

    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/entrar');
  });
});
