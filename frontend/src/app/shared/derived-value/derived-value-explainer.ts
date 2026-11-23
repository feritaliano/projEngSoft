import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { DerivedValue } from '../../api/models';
import { ExplainedAsset, Explained, explain, triggerLabel } from './explanation';
import { EXPLAINER_TEXTS } from './microcopy.pt-BR';

let nextId = 0;

/**
 * DerivedValueExplainer (C1, D12, D26): the ⓘ (or the link "Como foi calculado") of a number and its panel, for any
 * DerivedValue. Texts by formulaCode from microcopy.pt-BR.ts. The panel is a modal <dialog> (focus stays inside,
 * Esc closes) that slides in from the right on desktop and from the bottom, full screen, on mobile (handoff U5); on
 * open the focus goes to its title and on close back to the trigger. A link of an input swaps the panel to that value.
 */
@Component({
  selector: 'app-derived-value-explainer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <button
      #trigger
      type="button"
      [attr.aria-label]="name()"
      [attr.aria-expanded]="!!shown()"
      [attr.aria-controls]="panelId"
      class="inline-flex min-h-11 items-center justify-center rounded-sm text-link hover:underline md:min-h-6"
      [class]="link() ? 'text-label-md' : 'min-w-11 text-label-md md:min-w-6'"
      (click)="open()"
    >
      @if (link(); as text) {
        {{ text }}
      } @else {
        <span aria-hidden="true">ⓘ</span>
      }
    </button>
    <dialog
      #panel
      [id]="panelId"
      [attr.aria-labelledby]="titleId"
      class="m-0 overflow-y-auto bg-surface p-5 text-left text-primary shadow-overlay transition duration-200 ease-out backdrop:bg-scrim/55 starting:opacity-0 max-md:size-full max-md:max-h-none max-md:max-w-none motion-safe:starting:translate-y-full md:top-6 md:right-6 md:bottom-auto md:left-auto md:w-100 md:rounded-lg md:motion-safe:starting:translate-x-full md:motion-safe:starting:translate-y-0"
      (cancel)="$event.preventDefault(); close()"
    >
      @if (explanation(); as e) {
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <h2 [id]="titleId" tabindex="-1" class="flex-1 text-heading-sm text-primary">
              {{ texts.title }}
            </h2>
            <button
              type="button"
              class="min-h-11 rounded-sm px-1 text-label-md text-link hover:underline md:min-h-6"
              (click)="close()"
            >
              {{ texts.close }} <span aria-hidden="true">×</span>
            </button>
          </div>
          <div class="flex flex-col gap-1">
            <p class="text-body-sm text-secondary">{{ e.heading }}</p>
            <p class="text-numeric-lg tabular-nums" [class]="tones[e.tone]">{{ e.value }}</p>
          </div>
          <div class="flex flex-col gap-1 rounded-md bg-subtle p-3">
            <h3 class="text-label-sm text-secondary">{{ texts.formula }}</h3>
            <p class="text-body-sm text-primary">{{ e.formula }}</p>
          </div>
          @if (e.rows.length || e.empty) {
            <div class="flex flex-col gap-2">
              <h3 class="text-label-sm text-secondary">{{ texts.inputs }}</h3>
              @if (e.empty) {
                <p class="text-body-sm text-secondary">{{ e.empty }}</p>
              }
              <ul class="flex flex-col gap-3">
                @for (row of e.rows; track $index) {
                  <li class="flex items-start gap-3">
                    <div class="flex flex-1 flex-col">
                      <span class="text-body-sm text-primary">{{ row.label }}</span>
                      @if (row.link) {
                        <button
                          type="button"
                          class="self-start text-left text-caption text-link hover:underline"
                          (click)="show(row.link)"
                        >
                          {{ row.origin }}
                        </button>
                      } @else if (row.origin) {
                        <span class="text-caption text-secondary">{{ row.origin }}</span>
                      }
                    </div>
                    <span
                      class="whitespace-nowrap text-numeric-md tabular-nums"
                      [class]="tones[row.tone]"
                      >{{ row.value }}</span
                    >
                  </li>
                }
              </ul>
            </div>
          }
          <div class="flex flex-col gap-1">
            <h3 class="text-label-sm text-secondary">{{ texts.account }}</h3>
            <p class="text-numeric-md tabular-nums text-primary">{{ e.account }}</p>
          </div>
          <p class="text-body-sm text-secondary">{{ e.explanation }}</p>
          <p class="text-caption text-secondary">{{ e.footer }}</p>
        </div>
      }
    </dialog>
  `,
})
export class DerivedValueExplainer {
  readonly value = input.required<DerivedValue>();
  /** The asset of the number, for its name and the format of quantities; null for portfolio totals. */
  readonly asset = input<ExplainedAsset | null>(null);
  /** Resumo da operação (D42): the realized profit is an estimate there. */
  readonly preview = input(false);
  /** A text link instead of the ⓘ: "Como foi calculado" (indicators of the Detail) or another text. */
  readonly link = input<string | null>(null);

  protected readonly texts = EXPLAINER_TEXTS;
  protected readonly tones = {
    positive: 'text-positive',
    negative: 'text-negative',
    neutral: 'text-primary',
  };
  protected readonly panelId = `derived-value-panel-${nextId}`;
  protected readonly titleId = `derived-value-title-${nextId++}`;
  protected readonly shown = signal<Explained | null>(null);
  /**
   * "Como foi calculado: {Rótulo}" for the ⓘ and the link "Como foi calculado" (it contains the visible text,
   * WCAG 2.5.3); a link with another text is named by it.
   */
  protected readonly name = computed(() => {
    const link = this.link();
    return !link || link === EXPLAINER_TEXTS.title
      ? triggerLabel(this.value(), this.preview())
      : null;
  });
  protected readonly explanation = computed(() => {
    const shown = this.shown();
    return shown ? explain(shown, this.preview()) : null;
  });

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild.required<ElementRef<HTMLDialogElement>>('panel');
  private readonly injector = inject(Injector);

  protected open(): void {
    this.panel().nativeElement.showModal();
    this.show({ value: this.value(), asset: this.asset() });
  }

  /** Shows a value in the panel and puts the focus on its title, so the reader starts over (handoff U5). */
  protected show(target: Explained): void {
    this.shown.set(target);
    afterNextRender(() => document.getElementById(this.titleId)?.focus(), {
      injector: this.injector,
    });
  }

  protected close(): void {
    this.panel().nativeElement.close();
    this.shown.set(null);
    this.trigger().nativeElement.focus();
  }
}
