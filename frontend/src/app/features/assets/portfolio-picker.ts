import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { PortfolioDto } from '../../api/models';
import { Button } from '../../shared/ui/button';
import { portfolioSummary } from '../portfolios/portfolios-page';

/**
 * "Em qual carteira lançar {ativo}?" (frame 7, escolher carteira): the catalog asks the portfolio when the user has
 * more than one. A modal <dialog> like the ConfirmDialog (focus inside, Esc cancels, focus back to the opener), with
 * the portfolios as radio buttons and the first one chosen.
 */
@Component({
  selector: 'app-portfolio-picker',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      aria-labelledby="portfolio-picker-title"
      aria-describedby="portfolio-picker-text"
      class="m-auto w-11/12 max-w-110 rounded-xl bg-surface p-6 text-primary shadow-overlay backdrop:bg-scrim/55"
      (cancel)="$event.preventDefault(); cancelled.emit()"
    >
      <form class="flex flex-col gap-4" (submit)="$event.preventDefault(); chosen.emit(choice())">
        <h2 id="portfolio-picker-title" class="text-heading-md text-primary">
          Em qual carteira lançar {{ asset() }}?
        </h2>
        <p id="portfolio-picker-text" class="text-body-md text-secondary">
          A operação entra só na carteira escolhida. Posição e preço médio são calculados por
          carteira.
        </p>
        <fieldset class="flex flex-col gap-2">
          <legend class="sr-only">Carteira</legend>
          @for (portfolio of portfolios(); track portfolio.id) {
            <label
              class="flex cursor-pointer items-center gap-3 rounded-md border border-default p-3 has-checked:border-2 has-checked:border-primary has-checked:bg-primary-subtle"
            >
              <input
                type="radio"
                name="portfolio-picker"
                class="size-4"
                [value]="portfolio.id"
                [checked]="portfolio.id === choice()"
                (change)="choice.set(portfolio.id)"
              />
              <span class="flex flex-col">
                <span class="text-label-md text-primary">{{ portfolio.name }}</span>
                <span class="text-caption text-secondary">{{ summary(portfolio) }}</span>
              </span>
            </label>
          }
        </fieldset>
        <div class="flex flex-wrap justify-end gap-3">
          <button appButton variant="secondary" type="button" (click)="cancelled.emit()">
            Cancelar
          </button>
          <button appButton type="submit">Continuar</button>
        </div>
      </form>
    </dialog>
  `,
})
export class PortfolioPicker {
  /** The asset as the screens name it (ticker or display name). */
  readonly asset = input.required<string>();
  readonly portfolios = input.required<PortfolioDto[]>();
  readonly chosen = output<string>();
  readonly cancelled = output();

  protected readonly choice = linkedSignal(() => this.portfolios()[0]?.id ?? '');
  protected readonly summary = portfolioSummary;

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    const opener = document.activeElement as HTMLElement | null;
    const host: HTMLElement = inject(ElementRef).nativeElement;
    afterNextRender(() => {
      this.dialog().nativeElement.showModal();
      host.querySelector<HTMLInputElement>('input:checked')?.focus();
    });
    inject(DestroyRef).onDestroy(() => {
      this.dialog().nativeElement.close();
      if (opener?.isConnected) opener.focus();
    });
  }
}
