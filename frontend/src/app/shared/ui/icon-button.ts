import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Icon, IconName } from './icon';

/** Handoff U5: the tooltip shows 300 ms after hover or keyboard focus. */
export const TOOLTIP_DELAY_MS = 300;

/**
 * IconButton + Tooltip of the design system (D51): row and card actions that are only an icon. The aria-label is the
 * tooltip text + the target (claude/microcopy.md, section 7); the tooltip is not tied by aria-describedby, so the
 * screen reader does not repeat it, and it does not exist below 768 px (touch has no hover).
 */
@Component({
  selector: 'app-icon-button',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <button
      type="button"
      [attr.aria-label]="label()"
      class="relative flex size-11 items-center justify-center rounded-md transition-colors duration-150 ease-out md:size-8"
      [class]="tone()"
      (mouseenter)="showTooltip()"
      (focus)="showTooltip()"
      (mouseleave)="hideTooltip()"
      (blur)="hideTooltip()"
      (keydown.escape)="hideTooltip()"
    >
      <app-icon [name]="icon()" />
      @if (tooltipVisible()) {
        <span
          role="tooltip"
          class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-sm bg-inverse px-2 py-1 text-caption text-on-primary md:block"
          >{{ tooltip() }}</span
        >
      }
    </button>
  `,
})
export class IconButton {
  readonly icon = input.required<IconName>();
  /** Short text of the tooltip, e.g. "Excluir carteira". */
  readonly tooltip = input.required<string>();
  /** Tooltip text + target, e.g. "Excluir carteira Longo prazo". */
  readonly label = input.required<string>();

  protected readonly tooltipVisible = signal(false);
  protected readonly tone = computed(() =>
    this.icon() === 'delete'
      ? 'text-negative hover:bg-negative-subtle'
      : 'text-secondary hover:bg-subtle hover:text-primary',
  );
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected showTooltip(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.tooltipVisible.set(true), TOOLTIP_DELAY_MS);
  }

  /** Esc closes it without taking the focus away. */
  protected hideTooltip(): void {
    clearTimeout(this.timer);
    this.tooltipVisible.set(false);
  }
}
