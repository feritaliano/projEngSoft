import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap, throwError, timeout } from 'rxjs';
import { ProblemDetails } from '../../api/models';
import { ConnectionService } from './connection.service';

/** Handoff U5: 10 s without a response shows the connection failure state. */
export const NO_RESPONSE_TIMEOUT_MS = 10_000;

/**
 * Status 0 (server unreachable) or no response in 10 s turns on the global connection failure;
 * any HTTP response turns it off. Errors keep flowing to the caller, with the problem+json body.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const connection = inject(ConnectionService);
  return next(req).pipe(
    timeout({
      each: NO_RESPONSE_TIMEOUT_MS,
      with: () =>
        throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Timeout', url: req.url })),
    }),
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) connection.markOnline();
      },
      error: (error: unknown) => {
        if (!(error instanceof HttpErrorResponse)) return;
        if (error.status === 0) connection.markOffline();
        else connection.markOnline();
      },
    }),
  );
};

/** The RFC 7807 body (application/problem+json) of an API error, or null when there is none. */
export function problemOf(error: unknown): ProblemDetails | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body: unknown = error.error;
  return typeof body === 'object' && body !== null && 'status' in body && 'title' in body
    ? (body as ProblemDetails)
    : null;
}
