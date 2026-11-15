import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ConnectionBanner } from '../../core/layout/connection-banner';

/** Frames 1 and 2: logo, the card with the title and the form, and the footer note; outside the shell. */
@Component({
  selector: 'app-auth-layout',
  imports: [ConnectionBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-connection-banner />
    <main class="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-12">
      <p class="flex items-center gap-2 text-heading-md text-primary">
        <span
          aria-hidden="true"
          class="flex size-8 items-center justify-center rounded-md bg-primary text-label-md text-on-primary"
          >B3</span
        >
        Carteira B3
      </p>
      <section
        class="flex w-full max-w-105 flex-col gap-5 rounded-lg border border-default bg-surface p-8"
      >
        <div class="flex flex-col gap-1">
          <h1 class="text-heading-lg text-primary">{{ heading() }}</h1>
          <p class="text-body-md text-secondary">{{ lead() }}</p>
        </div>
        <ng-content />
      </section>
      <p class="text-center text-caption text-secondary">
        Ferramenta gratuita e educativa. Não recomenda compra ou venda de ativos.
      </p>
    </main>
  `,
})
export class AuthLayout {
  readonly heading = input.required<string>();
  readonly lead = input.required<string>();
}
