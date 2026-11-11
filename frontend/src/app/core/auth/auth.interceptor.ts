import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { AuthService } from './auth.service';

/**
 * API requests go with credentials (httpOnly refresh cookie) and the Bearer token. A 401 on a protected
 * route refreshes the token once (shared by concurrent requests) and repeats the request; a refused
 * refresh ends the session.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiPrefix = `${inject(ApiConfiguration).rootUrl}/api/v1/`;
  if (!req.url.startsWith(apiPrefix)) return next(req);

  const auth = inject(AuthService);
  const send = (token: string | null) =>
    next(
      req.clone({
        withCredentials: true,
        setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      }),
    );

  // Login, register, refresh and logout: a 401 there is the answer itself, not an expired token.
  if (req.url.startsWith(`${apiPrefix}auth/`)) return send(null);

  return send(auth.accessToken()).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        catchError((refreshError: unknown) => {
          if (refreshError instanceof HttpErrorResponse && refreshError.status === 401) {
            auth.expire();
          }
          return throwError(() => refreshError);
        }),
        switchMap((token) => send(token)),
      );
    }),
  );
};
