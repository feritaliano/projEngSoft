import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ErrorHandler,
  Injector,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PortfolioDto } from '../../api/models';
import { problemOf } from '../../core/http/error.interceptor';
import {
  PORTFOLIO_TEXTS,
  applyServerErrors,
  fieldErrorText,
} from '../../shared/forms/field-errors.pt-BR';
import { plural } from '../../shared/format/pt-br';
import { Button } from '../../shared/ui/button';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog';
import { Icon } from '../../shared/ui/icon';
import { IconButton } from '../../shared/ui/icon-button';
import { SKELETON_DELAY_MS } from '../../shared/ui/load-error';
import { TextField } from '../../shared/ui/text-field';
import { PortfoliosService } from './portfolios.service';

/** Handoff U5: on submit with errors, the focus goes to the first invalid field. */
const FIRST_INVALID = '[aria-invalid="true"]';

/** Card line of claude/microcopy.md, section 11. */
export function portfolioSummary({ assetCount, operationCount }: PortfolioDto): string {
  if (operationCount === 0) return 'Sem operações ainda';
  const operations = plural(operationCount, 'operação', 'operações');
  return assetCount === 0
    ? `nenhuma posição aberta · ${operations}`
    : `${plural(assetCount, 'ativo', 'ativos')} · ${operations}`;
}

/** Text of the frame "confirmação de exclusão" (C3, Excluir carteira), with operationCount. */
export function deletionText(operationCount: number): string {
  const operations =
    operationCount === 1
      ? 'a 1 operação lançada nela'
      : `as ${operationCount} operações lançadas nela`;
  return (
    `Isto apaga a carteira e ${operations}. A posição, o preço médio e o lucro realizado calculados a partir ` +
    'delas deixam de existir. Não dá para desfazer.'
  );
}

/**
 * Frame 3 (B1, RN02), single version (D48): only what has data in the S1. Market value and returns (S2, S9) stay out
 * of the DOM. States: loading (skeleton after 300 ms), error with "Tentar de novo", empty (creates the first
 * portfolio) and with data; create with the field error by field + code (D56); delete through ConfirmDialog (C3).
 */
@Component({
  selector: 'app-portfolios-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NgTemplateOutlet,
    Button,
    ConfirmDialog,
    Icon,
    IconButton,
    TextField,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 pb-12 pt-4 md:pt-8">
      <header class="flex flex-col gap-4 md:flex-row md:items-end">
        <div class="flex flex-1 flex-col gap-1">
          <h1 #title tabindex="-1" class="text-heading-lg text-primary md:text-heading-xl">
            Suas carteiras
          </h1>
          <p class="max-w-180 text-body-md text-secondary">
            Cada carteira agrupa suas operações de compra e venda. Posição e preço médio são
            calculados separadamente em cada uma.
          </p>
        </div>
        @if (status() !== 'ready' || portfolios().length) {
          <button
            appButton
            type="button"
            class="w-full md:w-auto"
            [disabled]="status() !== 'ready'"
            (click)="openCreate()"
          >
            <app-icon name="plus" />
            Nova carteira
          </button>
        }
      </header>

      @switch (status()) {
        @case ('loading') {
          <div aria-busy="true" class="flex flex-col gap-3">
            @if (slow()) {
              @for (card of skeletonCards; track $index) {
                <div
                  class="flex flex-col gap-2 rounded-lg border border-default bg-surface p-5"
                  aria-hidden="true"
                >
                  <div class="h-3.5 w-55 max-w-full rounded-sm bg-subtle"></div>
                  <div class="h-3.5 w-80 max-w-full rounded-sm bg-subtle"></div>
                </div>
              }
              <p class="text-caption text-secondary">Carregando suas carteiras…</p>
            }
          </div>
        }
        @case ('error') {
          <section
            role="alert"
            class="flex flex-col items-center gap-3 rounded-lg border border-default bg-surface p-10 text-center"
          >
            <h2 class="text-heading-md text-primary">Não conseguimos carregar suas carteiras</h2>
            <p class="text-body-md text-secondary">
              O servidor teve um problema. Suas carteiras e operações continuam salvas.
            </p>
            <button appButton variant="secondary" type="button" (click)="retry()">
              Tentar de novo
            </button>
          </section>
        }
        @default {
          @if (!portfolios().length) {
            <section
              class="flex flex-col items-center gap-4 rounded-lg border border-default bg-surface px-4 py-8 text-center md:p-12"
            >
              <h2 class="text-heading-lg text-primary">Você ainda não tem carteiras</h2>
              <p class="max-w-130 text-body-md text-secondary">
                Crie uma carteira para lançar suas compras e vendas. Você pode ter quantas quiser,
                por exemplo uma para longo prazo e outra para dividendos.
              </p>
              <ng-container [ngTemplateOutlet]="createForm" />
            </section>
          } @else {
            @if (creating()) {
              <section
                aria-labelledby="new-portfolio-title"
                class="flex flex-col gap-3 rounded-lg border border-default bg-surface p-4 md:p-5"
              >
                <h2 id="new-portfolio-title" class="text-heading-sm text-primary">Nova carteira</h2>
                <ng-container [ngTemplateOutlet]="createForm" />
              </section>
            }
            <ul class="flex flex-col gap-3">
              @for (portfolio of portfolios(); track portfolio.id) {
                <li
                  class="relative flex flex-col gap-3 rounded-lg border border-default bg-surface p-4 transition-colors duration-150 ease-out hover:border-strong link-focus:outline-2 link-focus:outline-offset-2 link-focus:outline-focus md:flex-row md:items-center md:gap-6 md:p-5"
                >
                  <div class="flex min-w-0 flex-1 flex-col gap-1">
                    <a
                      [id]="'portfolio-' + portfolio.id"
                      [routerLink]="['/carteiras', portfolio.id]"
                      [title]="portfolio.name"
                      class="line-clamp-2 text-heading-md text-primary after:absolute after:inset-0 focus-visible:outline-none"
                      >{{ portfolio.name }}</a
                    >
                    <p class="text-body-sm text-secondary">{{ summary(portfolio) }}</p>
                  </div>
                  <div class="flex items-center justify-end gap-2 md:gap-6">
                    <app-icon-button
                      class="relative z-10"
                      icon="delete"
                      tooltip="Excluir carteira"
                      [label]="'Excluir carteira ' + portfolio.name"
                      (click)="toDelete.set(portfolio)"
                    />
                    <span class="flex size-11 items-center justify-center text-secondary md:size-8">
                      <app-icon name="open" />
                    </span>
                  </div>
                </li>
              }
            </ul>
          }
        }
      }
    </div>

    <ng-template #createForm>
      <form
        [formGroup]="form"
        (ngSubmit)="create()"
        novalidate
        class="flex w-full flex-col gap-3 text-left md:w-auto md:flex-row md:items-start"
      >
        <app-text-field
          class="md:w-90"
          label="Nome da carteira"
          fieldId="portfolio-name"
          placeholder="Ex.: Longo prazo"
          autocomplete="off"
          [control]="form.controls.name"
          [error]="nameError()"
        />
        <div class="flex gap-2 md:pt-6">
          <button
            appButton
            type="submit"
            class="flex-1 md:flex-none"
            [disabled]="saving()"
            [attr.aria-busy]="saving() ? 'true' : null"
          >
            Criar carteira
          </button>
          @if (portfolios().length) {
            <button appButton variant="ghost" type="button" (click)="closeCreate()">
              Cancelar
            </button>
          }
        </div>
      </form>
    </ng-template>

    @if (toDelete(); as portfolio) {
      <app-confirm-dialog
        [heading]="'Excluir a carteira “' + portfolio.name + '”?'"
        [text]="deletionText(portfolio.operationCount)"
        confirmLabel="Excluir carteira"
        [typeToConfirm]="portfolio.name"
        typeToConfirmLabel="Para confirmar, digite o nome da carteira"
        [busy]="deleting()"
        (confirmed)="remove(portfolio)"
        (cancelled)="toDelete.set(null)"
      />
    }
  `,
})
export class PortfoliosPage {
  private readonly service = inject(PortfoliosService);
  private readonly errors = inject(ErrorHandler);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  protected readonly portfolios = signal<PortfolioDto[]>([]);
  protected readonly status = signal<'loading' | 'error' | 'ready'>('loading');
  protected readonly slow = signal(false);
  protected readonly creating = signal(false);
  protected readonly saving = signal(false);
  protected readonly toDelete = signal<PortfolioDto | null>(null);
  protected readonly deleting = signal(false);

  // RN02 checked by the API (unique name per user, trimmed, up to 150 characters); its 400/409 shows in the field.
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', Validators.required],
  });

  protected readonly skeletonCards = [1, 2, 3];
  protected readonly summary = portfolioSummary;
  protected readonly deletionText = deletionText;

  constructor() {
    this.load();
  }

  protected nameError(): string | null {
    return fieldErrorText(PORTFOLIO_TEXTS.name, this.form.controls.name);
  }

  protected retry(): void {
    this.load();
    this.focus('h1');
  }

  protected openCreate(): void {
    this.creating.set(true);
    this.focus('#portfolio-name');
  }

  protected closeCreate(): void {
    this.creating.set(false);
    this.form.reset();
  }

  protected create(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return this.focus(FIRST_INVALID);

    this.saving.set(true);
    this.form.disable();
    this.service.create(this.form.getRawValue().name).subscribe({
      next: (portfolio) => {
        this.saving.set(false);
        this.form.enable();
        this.closeCreate();
        this.portfolios.update((list) => [...list, portfolio]);
        this.focus(`#portfolio-${portfolio.id}`);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.form.enable();
        if (applyServerErrors(this.form, problemOf(error))) {
          this.focus(FIRST_INVALID);
        } else if (!isConnectionFailure(error)) {
          this.errors.handleError(error);
        }
      },
    });
  }

  protected remove(portfolio: PortfolioDto): void {
    this.deleting.set(true);
    const gone = () => {
      this.deleting.set(false);
      this.toDelete.set(null);
      this.portfolios.update((list) => list.filter(({ id }) => id !== portfolio.id));
      // The card that opened the dialog no longer exists.
      this.focus('h1');
    };
    this.service.remove(portfolio.id).subscribe({
      next: gone,
      error: (error: unknown) => {
        // 404: already deleted (another tab or device); the list just catches up.
        if (error instanceof HttpErrorResponse && error.status === 404) return gone();
        this.deleting.set(false);
        if (!isConnectionFailure(error)) this.errors.handleError(error);
      },
    });
  }

  private load(): void {
    this.status.set('loading');
    this.slow.set(false);
    const timer = setTimeout(() => this.slow.set(true), SKELETON_DELAY_MS);
    this.service.list().subscribe({
      next: (list) => {
        clearTimeout(timer);
        this.portfolios.set(list);
        this.status.set('ready');
      },
      // Any failure, connection included (the shell banner shows it too): the card lets the user load again.
      error: () => {
        clearTimeout(timer);
        this.status.set('error');
      },
    });
  }

  private focus(selector: string): void {
    afterNextRender(() => this.host.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}

/** Status 0: the shell banner shows it. */
const isConnectionFailure = (error: unknown) =>
  error instanceof HttpErrorResponse && error.status === 0;
