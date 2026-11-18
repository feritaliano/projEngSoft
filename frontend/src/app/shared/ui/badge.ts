import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const TONES = {
  neutral: 'bg-subtle text-secondary',
  primary: 'bg-primary-subtle text-link',
  warning: 'bg-warning-subtle text-warning',
} as const;

/** Badge of the design system; the color is never the only cue, the text says it (WCAG 1.4.1). */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm',
    '[class]': 'classes()',
  },
  template: `<ng-content />`,
})
export class Badge {
  readonly tone = input<keyof typeof TONES>('neutral');
  protected readonly classes = computed(() => TONES[this.tone()]);
}
