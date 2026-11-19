import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from './button';

/** Handoff U5/U7a: the skeleton only shows when the answer takes longer than this. */
export const SKELETON_DELAY_MS = 300;

/**
 * A failure the screen only shows (U7a): no network (shell banner), 401 (login) or 5xx. Anything else (400, 403, a
 * parse error...) is a bug of the front and also goes to the ErrorHandler.
 */
export const expectedFailure = (error: unknown): boolean =>
  error instanceof HttpErrorResponse &&
  (error.status === 0 || error.status === 401 || error.status >= 500);

/** Error card of a screen (U7a, microcopy section 12), with "Tentar de novo"; the page decides which failures show it. */
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
