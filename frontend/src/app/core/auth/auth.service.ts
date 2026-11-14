import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  defer,
  finalize,
  firstValueFrom,
  map,
  shareReplay,
  throwError,
} from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { authControllerLogin } from '../../api/fn/auth/auth-controller-login';
import { authControllerLogout } from '../../api/fn/auth/auth-controller-logout';
import { authControllerRefresh } from '../../api/fn/auth/auth-controller-refresh';
import { authControllerRegister } from '../../api/fn/auth/auth-controller-register';
import { AuthResponseDto, LogInDto, SignUpDto } from '../../api/models';

export const REFRESH_LOCK = 'carteira-b3-auth-refresh';

/** Session of the signed-in user. The access token lives only in memory, never in localStorage (D39). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly rootUrl = inject(ApiConfiguration).rootUrl;
  private readonly router = inject(Router);
  private readonly session = signal<AuthResponseDto | null>(null);
  private refreshInFlight: Observable<string> | null = null;

  readonly user = computed(() => this.session()?.user ?? null);
  readonly accessToken = computed(() => this.session()?.accessToken ?? null);

  /** Starts the session with the response of POST /auth/login or /auth/register. */
  start(session: AuthResponseDto): void {
    this.session.set(session);
  }

  /** POST /auth/login: on success the session starts; errors (400, 401, 429) go to the caller. */
  login(body: LogInDto): Observable<void> {
    return authControllerLogin(this.http, this.rootUrl, { body }).pipe(
      map(({ body: session }) => this.start(session)),
    );
  }

  /** POST /auth/register: the new account is already signed in (K2); errors (400, 409, 429) go to the caller. */
  register(body: SignUpDto): Observable<void> {
    return authControllerRegister(this.http, this.rootUrl, { body }).pipe(
      map(({ body: session }) => this.start(session)),
    );
  }

  /**
   * POST /auth/refresh, single flight: concurrent callers share one request, because presenting
   * an already-rotated refresh cookie revokes the whole session family and signs the user out (D39).
   * The Web Lock extends this to other tabs, which share the cookie: they wait and send the rotated one.
   * navigator.locks exists only in secure contexts (https, localhost); elsewhere it is per tab.
   */
  refresh(): Observable<string> {
    const request = authControllerRefresh(this.http, this.rootUrl);
    const locks = navigator.locks as LockManager | undefined;
    this.refreshInFlight ??= (
      locks ? defer(() => locks.request(REFRESH_LOCK, () => firstValueFrom(request))) : request
    ).pipe(
      map(({ body }) => {
        this.session.set(body);
        return body.accessToken;
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) this.session.set(null);
        return throwError(() => error);
      }),
      finalize(() => (this.refreshInFlight = null)),
      shareReplay(1),
    );
    return this.refreshInFlight;
  }

  /** The refresh was refused: back to the login with the expired-session notice. */
  expire(): void {
    this.session.set(null);
    void this.router.navigate(['/entrar'], { queryParams: { sessao: 'expirada' } });
  }

  logout(): void {
    const end = () => {
      this.session.set(null);
      void this.router.navigate(['/entrar']);
    };
    authControllerLogout(this.http, this.rootUrl).subscribe({
      next: end,
      error: (error: unknown) => {
        // Status 0: the banner shows it and the session is kept so the user can try again.
        if (error instanceof HttpErrorResponse && error.status === 0) return;
        // Any HTTP answer: the API already cleared the refresh cookie (finally in AuthController.logout).
        end();
      },
    });
  }
}
