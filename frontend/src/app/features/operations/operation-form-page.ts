import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ErrorHandler,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  debounceTime,
  forkJoin,
  map,
  merge,
  of,
  share,
  switchMap,
  takeUntil,
  timer,
} from 'rxjs';
import {
  BrokerDto,
  CreateOperationDto,
  DerivedValue,
  OperationDto,
  OperationType,
  PortfolioDto,
  RuleViolation,
  RuleViolationProblem,
} from '../../api/models';
import { problemOf } from '../../core/http/error.interceptor';
import { NotFoundPage } from '../../core/layout/not-found-page';
import { assetName } from '../../shared/assets/asset-type';
import {
  BusinessRuleError,
  RuleContext,
  quantityHint,
} from '../../shared/business-rule/business-rule-error';
import { DerivedValueExplainer } from '../../shared/derived-value/derived-value-explainer';
import {
  OPERATION_TEXTS,
  QUANTITY_TEXTS,
  applyServerErrors,
  fieldErrorText,
  focusFirstInvalid,
} from '../../shared/forms/field-errors.pt-BR';
import { formatDate, formatQuantity, todayInSaoPaulo } from '../../shared/format/pt-br';
import { Button } from '../../shared/ui/button';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog';
import { LoadError, SKELETON_DELAY_MS, expectedFailure } from '../../shared/ui/load-error';
import { TextField } from '../../shared/ui/text-field';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { AssetChoice, AssetCombobox } from './asset-combobox';
import {
  FEES_RULE,
  PRICE_RULE,
  QUANTITY_RULES,
  decimalValidator,
  feesField,
  priceField,
  quantityField,
  toApiDecimal,
  tradeDateValidator,
} from './operation-fields';
import { OperationSummary, SummaryOperation, SummaryState } from './operation-summary';
import { OperationsService } from './operations.service';

/** D42: the typing pause before asking the preview again. */
export const PREVIEW_DEBOUNCE_MS = 300;

/** What the catalog passes in the navigation state (C1, "Lançar operação"): the asset already chosen. */
export interface FormState {
  asset?: AssetChoice;
}

type FieldName = 'type' | 'assetId' | 'brokerId' | 'tradeDate' | 'unitPrice' | 'fees';

interface Saved {
  text: string;
  detail: string;
  /** The PM after a buy, from the last preview: "Ver como o preço médio mudou". */
  averagePrice: DerivedValue | null;
  asset: AssetChoice;
}

/**
 * Frame 5, operation form (B2, B3, B4): create, and edit from the History (GET of the operation). The Resumo da
 * operação comes from the preview of the backend (D42) while the fields are valid; a violation there shows the
 * BusinessRuleError before saving and disables the main button. When the preview fails the button stays enabled: the
 * 422 of the save covers RN07 and RN10. Field errors by field + code (D56); nothing computed here (RN11).
 */
@Component({
  selector: 'app-operation-form-page',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    RouterLink,
    NotFoundPage,
    AssetCombobox,
    BusinessRuleError,
    Button,
    ConfirmDialog,
    DerivedValueExplainer,
    LoadError,
    OperationSummary,
    TextField,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (status() === 'not-found') {
      <app-not-found-page />
    } @else {
      <div class="flex flex-col gap-6 pb-12 pt-4 md:pt-8">
        <div class="flex flex-col gap-4">
          <nav aria-label="Trilha de navegação">
            <ol class="flex flex-wrap items-center gap-2 text-body-sm text-secondary">
              <li>
                <a routerLink="/carteiras" [class]="crumb">Carteiras</a>
              </li>
              @if (portfolio(); as p) {
                <li aria-hidden="true">/</li>
                <li>
                  <a [routerLink]="['/carteiras', p.id]" [class]="crumb">{{ p.name }}</a>
                </li>
                @if (editing) {
                  <li aria-hidden="true">/</li>
                  <li>
                    <a [routerLink]="['/carteiras', p.id, 'historico']" [class]="crumb"
                      >Histórico</a
                    >
                  </li>
                }
              }
              <li aria-hidden="true">/</li>
              <li aria-current="page">{{ title }}</li>
            </ol>
          </nav>
          <div class="flex flex-col gap-1">
            <h1 tabindex="-1" class="text-heading-lg text-primary md:text-heading-xl">
              {{ title }}
            </h1>
            @if (portfolio(); as p) {
              <p class="text-body-md text-secondary">Carteira {{ p.name }}</p>
            }
          </div>
        </div>

        @switch (status()) {
          @case ('loading') {
            <p class="sr-only" aria-busy="true">Carregando…</p>
          }
          @case ('error') {
            <app-load-error
              heading="Não conseguimos carregar esta carteira"
              text="O servidor teve um problema. Suas operações continuam salvas."
              (retry)="load()"
            />
          }
          @default {
            <div class="flex flex-col gap-6 md:flex-row md:items-start">
              <form
                [formGroup]="form"
                novalidate
                class="flex flex-1 flex-col gap-5 rounded-lg border border-default bg-surface p-4 md:p-6"
                (ngSubmit)="submit()"
              >
                @if (saved(); as s) {
                  <section
                    id="operation-saved"
                    tabindex="-1"
                    role="status"
                    class="flex flex-col gap-2 rounded-lg border border-positive bg-positive-subtle p-4"
                  >
                    <p class="text-label-md text-positive">{{ s.text }}</p>
                    <p class="text-body-sm text-primary">{{ s.detail }}</p>
                    <div class="flex flex-wrap gap-4">
                      <a
                        [routerLink]="['/carteiras', portfolioId]"
                        class="inline-flex min-h-11 items-center text-label-md text-link hover:underline md:min-h-6"
                        >Ver carteira</a
                      >
                      @if (s.averagePrice; as average) {
                        <app-derived-value-explainer
                          [value]="average"
                          [asset]="s.asset"
                          link="Ver como o preço médio mudou"
                        />
                      }
                    </div>
                  </section>
                }
                @if (gone()) {
                  <section
                    role="alert"
                    class="flex flex-col gap-1 rounded-lg border border-negative bg-negative-subtle p-4"
                  >
                    <h2 class="text-label-md text-negative">Esta operação não existe mais</h2>
                    <p class="text-body-sm text-primary">
                      Ela pode ter sido excluída em outra aba ou dispositivo. Nada foi salvo. Volte
                      ao Histórico para ver a lista atualizada.
                    </p>
                  </section>
                }
                @if (violation(); as v) {
                  <app-business-rule-error
                    [violation]="v"
                    [context]="ruleContext(v)"
                    [portfolioId]="portfolioId"
                    [live]="savedViolation() ? 'alert' : 'polite'"
                  />
                }

                <fieldset class="flex flex-col gap-1">
                  <legend class="pb-1 text-label-md text-primary">Tipo de operação</legend>
                  <div class="flex gap-1 self-start rounded-md bg-subtle p-1">
                    @for (option of types; track option.value) {
                      <label
                        class="flex min-h-11 cursor-pointer items-center rounded-sm border border-transparent px-6 py-2 text-label-md text-secondary has-checked:border-primary has-checked:bg-surface has-checked:text-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus md:min-h-9"
                      >
                        <input
                          type="radio"
                          class="sr-only"
                          formControlName="type"
                          [value]="option.value"
                        />
                        {{ option.label }}
                      </label>
                    }
                  </div>
                </fieldset>

                <app-asset-combobox
                  [control]="form.controls.assetId"
                  [asset]="asset()"
                  [error]="errorOf('assetId')"
                  (assetChange)="chooseAsset($event)"
                />

                <div class="flex flex-col gap-5 md:flex-row md:gap-4">
                  <div class="flex flex-1 flex-col gap-1">
                    <label for="operation-broker" class="text-label-md text-primary"
                      >Corretora</label
                    >
                    <select
                      id="operation-broker"
                      formControlName="brokerId"
                      [attr.aria-invalid]="errorOf('brokerId') ? 'true' : null"
                      [attr.aria-describedby]="errorOf('brokerId') ? 'operation-broker-hint' : null"
                      class="h-11 w-full rounded-md bg-surface px-3 py-2 text-body-md text-primary"
                      [class]="
                        errorOf('brokerId') ? 'border-2 border-negative' : 'border border-strong'
                      "
                    >
                      <option value="" disabled></option>
                      @for (broker of brokers(); track broker.id) {
                        <option [value]="broker.id">{{ broker.name }}</option>
                      }
                    </select>
                    @if (errorOf('brokerId'); as message) {
                      <p id="operation-broker-hint" class="text-caption text-negative">
                        {{ message }}
                      </p>
                    }
                  </div>
                  <app-text-field
                    class="flex-1"
                    label="Data do pregão"
                    fieldId="operation-date"
                    type="date"
                    [max]="today"
                    [control]="form.controls.tradeDate"
                    [helper]="'Até hoje, ' + date(today) + '.'"
                    [error]="errorOf('tradeDate')"
                  />
                </div>

                <div class="flex flex-col gap-5 md:flex-row md:gap-4">
                  <app-text-field
                    class="flex-1"
                    label="Quantidade"
                    fieldId="operation-quantity"
                    inputMode="decimal"
                    autocomplete="off"
                    [control]="form.controls.quantity"
                    [error]="quantityError()"
                  />
                  <app-text-field
                    class="flex-1"
                    label="Preço unitário (R$)"
                    fieldId="operation-price"
                    inputMode="decimal"
                    autocomplete="off"
                    [control]="form.controls.unitPrice"
                    [error]="errorOf('unitPrice')"
                  />
                  <app-text-field
                    class="flex-1"
                    label="Custos (R$)"
                    fieldId="operation-fees"
                    inputMode="decimal"
                    autocomplete="off"
                    [control]="form.controls.fees"
                    helper="Corretagem e taxas da nota. Use 0 se não houve."
                    [error]="errorOf('fees')"
                  />
                </div>

                @if (!wide()) {
                  <ng-container [ngTemplateOutlet]="summaryBlock" />
                }

                <div class="flex flex-col gap-3 md:flex-row md:items-center">
                  <button
                    appButton
                    type="submit"
                    [disabled]="saving() || gone() || !!previewViolation()"
                    [attr.aria-busy]="saving() ? 'true' : null"
                  >
                    {{ submitLabel() }}
                  </button>
                  <a appButton variant="ghost" [routerLink]="back">
                    {{ saved() ? 'Voltar para a carteira' : 'Cancelar' }}
                  </a>
                </div>
              </form>

              @if (wide()) {
                <aside class="flex w-85 shrink-0 flex-col gap-4">
                  <ng-container [ngTemplateOutlet]="summaryBlock" />
                  <section
                    class="flex flex-col gap-3 rounded-lg border border-default bg-surface p-5"
                  >
                    <h2 class="text-heading-sm text-primary">Como a operação entra na carteira</h2>
                    <ul class="flex flex-col gap-3 text-body-sm text-secondary">
                      <li>• Compra recalcula o preço médio do ativo, somando os custos da nota.</li>
                      <li>• Venda não muda o preço médio. Ela gera lucro ou prejuízo realizado.</li>
                      <li>
                        • Operação com data antiga recalcula tudo o que vem depois dela, em ordem de
                        data.
                      </li>
                    </ul>
                  </section>
                </aside>
              }
            </div>
          }
        }
      </div>

      <ng-template #summaryBlock>
        <app-operation-summary
          [state]="summary()"
          [operation]="previewed()"
          [portfolioName]="portfolio()?.name ?? ''"
          [editing]="editing"
          (retry)="recalculate.next()"
        />
      </ng-template>

      @if (confirming() && original(); as o) {
        <app-confirm-dialog
          [heading]="confirmHeading(o)"
          [text]="confirmText(o)"
          confirmLabel="Salvar alteração"
          variant="primary"
          [busy]="saving()"
          (confirmed)="save()"
          (cancelled)="confirming.set(false)"
        />
      }
    }
  `,
})
export class OperationFormPage {
  private readonly portfolios = inject(PortfoliosService);
  private readonly service = inject(OperationsService);
  private readonly router = inject(Router);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly errors = inject(ErrorHandler);
  private readonly params = inject(ActivatedRoute).snapshot.paramMap;
  protected readonly portfolioId = this.params.get('id') ?? '';
  private readonly operationId = this.params.get('operationId');
  protected readonly editing = !!this.operationId;
  protected readonly title = this.editing ? 'Editar operação' : 'Lançar operação';
  protected readonly today = todayInSaoPaulo();

  protected readonly status = signal<'loading' | 'error' | 'not-found' | 'ready'>('loading');
  protected readonly portfolio = signal<PortfolioDto | null>(null);
  protected readonly brokers = signal<BrokerDto[]>([]);
  protected readonly original = signal<OperationDto | null>(null);
  /** The operation being edited no longer exists (404, or NOT_FOUND on replacesOperationId). */
  protected readonly gone = signal(false);
  protected readonly asset = signal<AssetChoice | null>(
    (this.router.currentNavigation()?.extras.state as FormState | undefined)?.asset ?? null,
  );
  protected readonly summary = signal<SummaryState>({ kind: 'waiting' });
  /** The operation of the last preview asked: the Resumo describes it, not the fields being typed. */
  protected readonly previewed = signal<SummaryOperation | null>(null);
  protected readonly savedViolation = signal<RuleViolation | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal<Saved | null>(null);
  protected readonly confirming = signal(false);
  protected readonly recalculate = new Subject<void>();

  protected readonly form = new FormGroup({
    type: new FormControl<OperationType>('BUY', { nonNullable: true }),
    assetId: new FormControl(this.asset()?.id ?? '', {
      nonNullable: true,
      validators: Validators.required,
    }),
    brokerId: new FormControl('', { nonNullable: true, validators: Validators.required }),
    tradeDate: new FormControl(this.today, { nonNullable: true, validators: tradeDateValidator }),
    quantity: new FormControl('', {
      nonNullable: true,
      validators: decimalValidator(() => QUANTITY_RULES[this.asset()?.assetType ?? 'STOCK']),
    }),
    unitPrice: new FormControl('', {
      nonNullable: true,
      validators: decimalValidator(() => PRICE_RULE),
    }),
    fees: new FormControl('0,00', {
      nonNullable: true,
      validators: decimalValidator(() => FEES_RULE),
    }),
  });

  private readonly type = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });
  protected readonly previewViolation = computed(() => {
    const summary = this.summary();
    return summary.kind === 'ready' ? (summary.preview.violation ?? null) : null;
  });
  protected readonly violation = computed(() => this.savedViolation() ?? this.previewViolation());
  protected readonly submitLabel = computed(() => {
    if (this.editing) return 'Salvar alteração';
    return this.type() === 'SELL' ? 'Lançar venda' : 'Lançar compra';
  });
  protected readonly back = this.editing
    ? ['/carteiras', this.portfolioId, 'historico']
    : ['/carteiras', this.portfolioId];

  /** Below 768 px the Resumo goes inside the form, before the buttons (frame 5, mobile). */
  protected readonly wide = signal(true);

  protected readonly types = [
    { value: 'BUY' as const, label: 'Compra' },
    { value: 'SELL' as const, label: 'Venda' },
  ];
  protected readonly crumb =
    'inline-flex min-h-11 items-center text-label-md text-link hover:underline md:min-h-6';
  protected readonly date = formatDate;

  constructor() {
    const media = typeof matchMedia === 'function' ? matchMedia('(min-width: 768px)') : null;
    if (media) {
      this.wide.set(media.matches);
      const follow = (event: MediaQueryListEvent) => this.wide.set(event.matches);
      media.addEventListener('change', follow);
      inject(DestroyRef).onDestroy(() => media.removeEventListener('change', follow));
    }

    // A 422 is about the values sent: any change takes it away (the preview says if it still holds).
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.savedViolation.set(null));
    merge(this.form.valueChanges.pipe(debounceTime(PREVIEW_DEBOUNCE_MS)), this.recalculate)
      .pipe(
        switchMap(() => this.preview()),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.summary.set(state));

    this.load();
  }

  /** The portfolio (name), the brokers and, in the edit mode, the operation. */
  protected load(): void {
    this.status.set('loading');
    const operation: Observable<OperationDto | null> = this.operationId
      ? this.service.get(this.portfolioId, this.operationId).pipe(
          catchError((error: unknown) => {
            if (!(error instanceof HttpErrorResponse && error.status === 404)) throw error;
            this.markGone();
            return of(null);
          }),
        )
      : of(null);
    forkJoin({
      portfolio: this.portfolios.get(this.portfolioId),
      brokers: this.service.brokers(),
      operation,
    }).subscribe({
      next: ({ portfolio, brokers, operation: found }) => {
        this.portfolio.set(portfolio);
        this.brokers.set(brokers);
        this.status.set('ready');
        if (found) this.fill(found);
      },
      error: (error: unknown) => {
        const notFound = error instanceof HttpErrorResponse && error.status === 404;
        this.status.set(notFound ? 'not-found' : 'error');
        if (!notFound && !expectedFailure(error)) this.errors.handleError(error);
      },
    });
  }

  protected chooseAsset(asset: AssetChoice | null): void {
    this.asset.set(asset);
    // The quantity rule depends on the class of the asset (RN04, D55).
    this.form.controls.quantity.updateValueAndValidity();
  }

  protected errorOf(name: FieldName): string | null {
    return fieldErrorText(OPERATION_TEXTS[name], this.form.controls[name]);
  }

  /** The field error, or the help of the violation (microcopy, section 8) shown as an error of the field. */
  protected quantityError(): string | null {
    const control = this.form.controls.quantity;
    const texts = QUANTITY_TEXTS[this.asset()?.assetType ?? 'STOCK'];
    const violation = this.violation();
    return fieldErrorText(texts, control) ?? (violation ? quantityHint(violation) : null);
  }

  /** The API does not say which action caused an RN10: the form knows (handoff, C2). */
  protected ruleContext(violation: RuleViolation): RuleContext {
    const original = this.original();
    if (!original) return { action: 'create', date: this.form.controls.tradeDate.value };
    const assetChanged = this.asset()?.id !== original.asset.id;
    if (assetChanged && violation.operation.asset.id === original.asset.id) {
      return { action: 'change-asset', asset: assetName(original.asset) };
    }
    return { action: 'edit', type: original.type, date: original.tradeDate };
  }

  protected confirmHeading(original: OperationDto): string {
    const type = original.type === 'BUY' ? 'compra' : 'venda';
    return `Salvar a alteração na ${type} de ${formatDate(original.tradeDate)}?`;
  }

  /** The recalculation starts at the earlier of the two dates (RN09); ISO dates compare as text. */
  protected confirmText(original: OperationDto): string {
    const date = this.form.controls.tradeDate.value;
    const from = date < original.tradeDate ? date : original.tradeDate;
    const asset = assetName(this.asset() ?? original.asset);
    return `A posição, o preço médio e o lucro realizado de ${asset} nesta carteira serão recalculados a partir de ${formatDate(from)}.`;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }
    if (this.editing) this.confirming.set(true);
    else this.save();
  }

  protected save(): void {
    const body = this.body();
    const asset = this.asset();
    if (!body || !asset) return;
    this.saving.set(true);
    this.saved.set(null);
    this.savedViolation.set(null);
    const request = this.operationId
      ? this.service.update(this.portfolioId, this.operationId, body)
      : this.service.create(this.portfolioId, body);
    request.subscribe({
      next: (operation) => {
        this.saving.set(false);
        this.confirming.set(false);
        if (this.editing) {
          this.router.navigate(['/carteiras', this.portfolioId, 'historico'], {
            queryParams: { operacao: operation.id },
          });
        } else {
          this.created(operation, asset);
        }
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.confirming.set(false);
        this.saveFailed(error);
      },
    });
  }

  /** Frame "sucesso": the notice, and the form again with the type and broker kept. */
  private created(operation: OperationDto, asset: AssetChoice): void {
    const summary = this.summary();
    const name = assetName(asset);
    const buy = operation.type === 'BUY';
    this.saved.set({
      text: `${buy ? 'Compra' : 'Venda'} de ${formatQuantity(operation.quantity, asset.assetType)} ${name} lançada na carteira ${this.portfolio()?.name}.`,
      detail: `Posição, preço médio e custo total de ${name} foram recalculados.`,
      averagePrice:
        buy && summary.kind === 'ready' ? (summary.preview.averagePriceAfter ?? null) : null,
      asset,
    });
    const { type, brokerId } = this.form.getRawValue();
    this.asset.set(null);
    this.form.reset({
      type,
      brokerId,
      assetId: '',
      tradeDate: this.today,
      quantity: '',
      unitPrice: '',
      fees: '0,00',
    });
    this.focus('#operation-saved');
  }

  private saveFailed(error: unknown): void {
    const status = error instanceof HttpErrorResponse ? error.status : null;
    const violation = (problemOf(error) as Partial<RuleViolationProblem> | null)?.violation;
    if (status === 422 && violation) {
      this.savedViolation.set(violation);
      return;
    }
    if (status === 400 && applyServerErrors(this.form, problemOf(error))) {
      this.focusFirstInvalid();
      return;
    }
    if (status === 404) {
      if (this.editing) this.markGone();
      else this.status.set('not-found');
      return;
    }
    // shortcut: a 5xx or no network on save shows nothing besides the shell banner (no text in the microcopy yet);
    // the values stay in the form for another try.
    if (!expectedFailure(error)) this.errors.handleError(error);
  }

  private fill(operation: OperationDto): void {
    this.original.set(operation);
    this.asset.set(operation.asset);
    this.form.setValue({
      type: operation.type,
      assetId: operation.asset.id,
      brokerId: operation.broker.id,
      tradeDate: operation.tradeDate,
      quantity: quantityField(operation.quantity, operation.asset.assetType),
      unitPrice: priceField(operation.unitPrice),
      fees: feesField(operation.fees),
    });
  }

  private markGone(): void {
    this.gone.set(true);
    this.summary.set({ kind: 'gone' });
  }

  /** The body of POST/PATCH and of the preview, in the API format; null while a field is invalid. */
  private body(): CreateOperationDto | null {
    const asset = this.asset();
    if (this.form.invalid || !asset) return null;
    const { type, brokerId, tradeDate, quantity, unitPrice, fees } = this.form.getRawValue();
    return {
      type,
      assetId: asset.id,
      brokerId,
      tradeDate,
      quantity: toApiDecimal(quantity),
      unitPrice: toApiDecimal(unitPrice),
      fees: toApiDecimal(fees),
    };
  }

  /** D42: the preview of the valid form; "calculating" only when it takes longer than 300 ms. */
  private preview(): Observable<SummaryState> {
    if (this.gone()) return of({ kind: 'gone' });
    const body = this.body();
    const asset = this.asset();
    if (!body || !asset) {
      this.previewed.set(null);
      return of({ kind: 'waiting' });
    }
    this.previewed.set({ ...body, asset });
    const replaces = this.operationId ? { replacesOperationId: this.operationId } : {};
    const result = this.service.preview(this.portfolioId, { ...body, ...replaces }).pipe(
      map((preview): SummaryState => ({ kind: 'ready', preview })),
      catchError((error: unknown) => of(this.previewFailed(error))),
      share(),
    );
    return merge(
      timer(SKELETON_DELAY_MS).pipe(
        map((): SummaryState => ({ kind: 'calculating' })),
        takeUntil(result),
      ),
      result,
    );
  }

  /**
   * 400 NOT_FOUND on replacesOperationId: the operation was deleted elsewhere. Any other 400 means the fields: the
   * save shows them. Network or 5xx: "prévia indisponível", and the save still works (handoff, D42).
   */
  private previewFailed(error: unknown): SummaryState {
    const errors = problemOf(error)?.errors ?? [];
    if (errors.some((e) => e.field === 'replacesOperationId' && e.code === 'NOT_FOUND')) {
      this.gone.set(true);
      return { kind: 'gone' };
    }
    if (error instanceof HttpErrorResponse && error.status === 400) return { kind: 'waiting' };
    if (!expectedFailure(error)) this.errors.handleError(error);
    return { kind: 'unavailable' };
  }

  private focusFirstInvalid(): void {
    afterNextRender(() => focusFirstInvalid(this.host), { injector: this.injector });
  }

  private focus(selector: string): void {
    afterNextRender(() => this.host.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}
