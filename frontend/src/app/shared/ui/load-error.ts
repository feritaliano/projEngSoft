import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from './button';

/** Handoff U5/U7a: the skeleton only shows when the answer takes longer than this. */
export const SKELETON_DELAY_MS = 300;

/** Error card of a screen (U7a, microcopy section 12): 5xx or unexpected answer, with "Tentar de novo". */
@Component({
  selector: 'app-load-error',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      role="alert"
      class="flex flex-col items-center gap-3 rounded-lg border border-default bg-surface p-10 text-center"
    >
      <h2 class="text-heading-md text-primary">{{ heading() }}</h2>
      <p class="text-body-md text-secondary">{{ text() }}</p>
      <button appButton variant="secondary" type="button" (click)="retry.emit()">
        Tentar de novo
      </button>
    </section>
  `,
})
export class LoadError {
  readonly heading = input.required<string>();
  readonly text = input.required<string>();
  readonly retry = output();
}
