import { Directive, computed, input } from '@angular/core';

const BASE =
  'inline-flex h-11 min-w-24 items-center justify-center gap-2 rounded-md px-4 py-2 text-label-md ' +
  'transition-colors duration-150 ease-out disabled:opacity-45';

const VARIANTS = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border border-strong bg-surface text-primary hover:bg-subtle',
} as const;

/** Button of the design system (Figma "Button"): `<button appButton>` acts, `<a appButton>` navigates. */
@Directive({
  selector: 'button[appButton], a[appButton]',
  host: { '[class]': 'classes()' },
})
export class Button {
  readonly variant = input<keyof typeof VARIANTS>('primary');
  protected readonly classes = computed(() => `${BASE} ${VARIANTS[this.variant()]}`);
}
