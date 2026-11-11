import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { ApiConfiguration } from '../../api/api-configuration';
import { healthControllerCheck } from '../../api/fn/health/health-controller-check';

/** Global "no connection to the server" state, set by the error interceptor. */
@Injectable({ providedIn: 'root' })
export class ConnectionService {
  private readonly http = inject(HttpClient);
  private readonly rootUrl = inject(ApiConfiguration).rootUrl;
  private readonly isOffline = signal(false);

  readonly offline = this.isOffline.asReadonly();

  markOffline(): void {
    this.isOffline.set(true);
  }

  markOnline(): void {
    this.isOffline.set(false);
  }

  /** Pings GET /health; the error interceptor updates the state from the outcome. */
  retry(): void {
    healthControllerCheck(this.http, this.rootUrl).subscribe({ error: () => undefined });
  }
}
