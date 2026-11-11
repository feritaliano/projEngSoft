import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Button } from '../../shared/ui/button';
import { ConnectionService } from '../http/connection.service';

/** Frame L "falha de conexão": "Tentaremos de novo automaticamente". */
export const AUTO_RETRY_INTERVAL_MS = 10_000;

@Component({
  selector: 'app-connection-banner',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="status">
      @if (connection.offline()) {
        <div
          class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-b border-negative bg-negative-subtle px-4 py-3 text-center md:px-8"
        >
          <p class="text-label-md text-negative">Sem conexão com o servidor.</p>
          <p class="text-body-sm text-primary">
            O que você já salvou não foi perdido. Tentaremos de novo automaticamente.
          </p>
          <button type="button" appButton variant="secondary" (click)="connection.retry()">
            Tentar agora
          </button>
        </div>
      }
    </div>
  `,
})
export class ConnectionBanner {
  protected readonly connection = inject(ConnectionService);

  constructor() {
    effect((onCleanup) => {
      if (!this.connection.offline()) return;
      const id = setInterval(() => this.connection.retry(), AUTO_RETRY_INTERVAL_MS);
      onCleanup(() => clearInterval(id));
    });
  }
}
