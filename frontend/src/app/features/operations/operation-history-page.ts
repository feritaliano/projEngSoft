import { HttpErrorResponse } from '@angular/common/http';
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
import { ActivatedRoute } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { AssetRef, AssetType, BrokerDto, OperationDto, PortfolioDto } from '../../api/models';
import { NotFoundPage } from '../../core/layout/not-found-page';
import { ASSET_TYPE, CHIP_ORDER, assetName } from '../../shared/assets/asset-type';
import { formatDate, formatMoney, formatQuantity, plural } from '../../shared/format/pt-br';
import { AssetAvatar } from '../../shared/ui/asset-avatar';
import { Badge } from '../../shared/ui/badge';
import { Button } from '../../shared/ui/button';
import { LoadError, SKELETON_DELAY_MS, expectedFailure } from '../../shared/ui/load-error';
import { PortfolioHeader } from '../portfolios/portfolio-header';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { OperationFilters, OperationsService } from './operations.service';

const NO_FILTERS: OperationFilters = { assetId: '', brokerId: '', assetType: null };

/** Line below the name in the History (microcopy, section 11). */
export function historySubtitle({ operationCount, lastTradeDate }: PortfolioDto): string {
  if (!lastTradeDate) return 'Nenhuma operação ainda';
  return `${plural(operationCount, 'operação', 'operações')} · última em ${formatDate(lastTradeDate)}`;
}

/** Title of "filtro sem resultado" (frame 6; microcopy, section 11, for the type chip). */
export function noResultTitle(
  filters: OperationFilters,
  asset: AssetRef | undefined,
  broker: BrokerDto | undefined,
): string {
  let what = '';
  if (asset) what = `de ${assetName(asset)}`;
  else if (filters.assetType) what = ASSET_TYPE[filters.assetType].of;
  const where = broker ? `na ${broker.name}` : 'nesta carteira';
  return ['Nenhuma operação', what, where].filter(Boolean).join(' ');
}

/**
 * Frame 6, tab Histórico of the Detail (B5, D45): operations of the portfolio, most recent first, filtered by asset,
 * broker and asset class (7 fixed chips), a page at a time with "Carregar mais".
 */
@Component({
  selector: 'app-operation-history-page',
  imports: [NotFoundPage, PortfolioHeader, AssetAvatar, Badge, Button, LoadError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (status() === 'not-found') {
      <app-not-found-page />
    } @else {
      <div class="flex flex-col gap-6 pb-12 pt-4 md:pt-8">
        <app-portfolio-header [portfolio]="portfolio()" [subtitle]="subtitle()" />

        @if (status() === 'error') {
          <app-load-error
            heading="Não conseguimos carregar as operações"
            text="O servidor teve um problema. Suas operações continuam salvas."
            (retry)="retry()"
          />
        } @else if (portfolio()?.operationCount === 0) {
          <section
            class="flex flex-col items-center gap-4 rounded-lg border border-default bg-surface px-4 py-8 text-center md:p-12"
          >
            <h2 class="text-heading-lg text-primary">Nenhuma operação nesta carteira</h2>
            <p class="max-w-130 text-body-md text-secondary">
              As compras e vendas que você lançar aparecem aqui, da mais recente para a mais antiga.
            </p>
          </section>
        } @else {
          @if (portfolio()) {
            <div class="flex flex-col gap-4 md:flex-row md:items-end">
              <div class="flex flex-col gap-1">
                <label for="filter-asset" class="text-label-md text-primary">Ativo</label>
                <select id="filter-asset" [class]="select" (change)="choose('assetId', $event)">
                  <option value="" [selected]="!filters().assetId">Todos</option>
                  @for (asset of assets(); track asset.id) {
                    <option [value]="asset.id" [selected]="asset.id === filters().assetId">
                      {{ name(asset) }}
                    </option>
                  }
                </select>
              </div>
              <div class="flex flex-col gap-1">
                <label for="filter-broker" class="text-label-md text-primary">Corretora</label>
                <select id="filter-broker" [class]="select" (change)="choose('brokerId', $event)">
                  <option value="" [selected]="!filters().brokerId">Todas</option>
                  @for (broker of brokers(); track broker.id) {
                    <option [value]="broker.id" [selected]="broker.id === filters().brokerId">
                      {{ broker.name }}
                    </option>
                  }
                </select>
              </div>
              <p aria-live="polite" class="text-body-sm text-secondary md:pb-3">
                {{ status() === 'loading' ? 'Carregando operações…' : count() }}
              </p>
              @if (filtered()) {
                <button
                  type="button"
                  class="min-h-11 self-start rounded-sm text-label-md text-link hover:underline md:min-h-6 md:self-auto md:pb-3"
                  (click)="clearFilters()"
                >
                  Limpar filtros
                </button>
              }
            </div>

            <div class="flex flex-col gap-1">
              <p id="type-filter-label" class="text-label-md text-primary">Tipo de ativo</p>
              <div
                role="group"
                aria-labelledby="type-filter-label"
                class="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 md:mx-0 md:flex-wrap md:px-0"
              >
                @for (chip of chips; track chip.label) {
                  <button
                    type="button"
                    [attr.aria-pressed]="filters().assetType === chip.type"
                    class="min-h-11 shrink-0 rounded-full border px-4 py-2 text-label-md md:min-h-9"
                    [class]="
                      filters().assetType === chip.type
                        ? 'border-primary bg-primary-subtle text-link'
                        : 'border-strong text-primary hover:bg-subtle'
                    "
                    (click)="setFilters({ assetType: chip.type })"
                  >
                    {{ chip.label }}
                  </button>
                }
              </div>
            </div>
          }

          @if (status() === 'loading') {
            <div id="history-loading" tabindex="-1" aria-busy="true">
              @if (slow()) {
                <div
                  class="flex flex-col gap-4 rounded-lg border border-default bg-surface p-5"
                  aria-hidden="true"
                >
                  @for (row of [1, 2, 3, 4, 5, 6]; track row) {
                    <div class="flex gap-6">
                      <div class="h-3.5 w-20 rounded-sm bg-subtle"></div>
                      <div class="h-3.5 w-30 rounded-sm bg-subtle"></div>
                      <div class="h-3.5 flex-1 rounded-sm bg-subtle"></div>
                    </div>
                  }
                </div>
                @if (!portfolio()) {
                  <p class="pt-3 text-caption text-secondary">Carregando operações…</p>
                }
              }
            </div>
          } @else if (!items().length) {
            <section
              class="flex flex-col items-center gap-3 rounded-lg border border-default bg-surface p-10 text-center"
            >
              <h2 class="text-heading-md text-primary">{{ noResult() }}</h2>
              <button appButton variant="secondary" type="button" (click)="clearFilters()">
                Limpar filtros
              </button>
            </section>
          } @else {
            <div
              class="hidden overflow-x-auto rounded-lg border border-default bg-surface md:block"
            >
              <table class="w-full tabular-nums">
                <caption class="sr-only">
                  Operações da carteira, da mais recente para a mais antiga
                </caption>
                <thead class="bg-subtle text-label-sm text-secondary">
                  <tr class="border-b border-default">
                    <th scope="col" class="px-5 py-3 text-left">Data</th>
                    <th scope="col" class="px-3 py-3 text-left">Tipo</th>
                    <th scope="col" class="px-3 py-3 text-left">Ativo</th>
                    <th scope="col" class="px-3 py-3 text-left">Corretora</th>
                    <th scope="col" class="px-3 py-3 text-right">Quantidade</th>
                    <th scope="col" class="px-3 py-3 text-right">Preço unitário</th>
                    <th scope="col" class="px-5 py-3 text-right">Custos</th>
                  </tr>
                </thead>
                <tbody>
                  @for (operation of items(); track operation.id) {
                    <tr
                      class="border-b border-default text-numeric-md text-primary last:border-b-0"
                    >
                      <td class="whitespace-nowrap px-5 py-3">{{ date(operation.tradeDate) }}</td>
                      <td class="px-3 py-3">
                        <app-badge [tone]="operation.type === 'BUY' ? 'primary' : 'warning'">{{
                          typeLabel(operation)
                        }}</app-badge>
                      </td>
                      <th scope="row" class="px-3 py-3 text-left font-normal">
                        <span class="flex items-center gap-3">
                          <app-asset-avatar [asset]="operation.asset" />
                          {{ name(operation.asset) }}
                        </span>
                      </th>
                      <td class="px-3 py-3 text-body-sm text-secondary">
                        {{ operation.broker.name }}
                      </td>
                      <td class="px-3 py-3 text-right">{{ quantity(operation) }}</td>
                      <td class="whitespace-nowrap px-3 py-3 text-right">
                        {{ money(operation.unitPrice) }}
                      </td>
                      <td class="whitespace-nowrap px-5 py-3 text-right">
                        {{ money(operation.fees) }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <ul class="flex flex-col gap-3 md:hidden">
              @for (operation of items(); track operation.id) {
                <li class="flex flex-col gap-2 rounded-lg border border-default bg-surface p-4">
                  <div class="flex items-center gap-2">
                    <app-asset-avatar [asset]="operation.asset" />
                    <app-badge [tone]="operation.type === 'BUY' ? 'primary' : 'warning'">{{
                      typeLabel(operation)
                    }}</app-badge>
                    <span class="flex-1 text-label-md text-primary">{{
                      name(operation.asset)
                    }}</span>
                    <span class="text-body-sm text-secondary">{{ date(operation.tradeDate) }}</span>
                  </div>
                  <p class="text-numeric-md tabular-nums text-primary">
                    {{ quantity(operation) }} × {{ money(operation.unitPrice) }} · custos
                    {{ money(operation.fees) }}
                  </p>
                  <p class="text-caption text-secondary">{{ operation.broker.name }}</p>
                </li>
              }
            </ul>
            @if (items().length < total()) {
              <button
                appButton
                variant="secondary"
                type="button"
                class="self-center"
                [disabled]="loadingMore()"
                [attr.aria-busy]="loadingMore() ? 'true' : null"
                (click)="loadMore()"
              >
                Carregar mais
              </button>
            }
          }
        }
      </div>
    }
  `,
})
export class OperationHistoryPage {
  private readonly portfoliosService = inject(PortfoliosService);
  private readonly service = inject(OperationsService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly errors = inject(ErrorHandler);
  private request?: Subscription;
  private timer?: ReturnType<typeof setTimeout>;
  /** No h1 while the name is unknown (U7a): after a retry of the whole screen, the title gets the focus when it comes. */
  private focusTitleOnLoad = false;

  protected readonly portfolio = signal<PortfolioDto | null>(null);
  protected readonly assets = signal<AssetRef[]>([]);
  protected readonly brokers = signal<BrokerDto[]>([]);
  protected readonly filters = signal<OperationFilters>(NO_FILTERS);
  protected readonly items = signal<OperationDto[]>([]);
  protected readonly total = signal(0);
  private readonly page = signal(1);
  protected readonly status = signal<'loading' | 'error' | 'not-found' | 'ready'>('loading');
  protected readonly slow = signal(false);
  protected readonly loadingMore = signal(false);

  protected readonly subtitle = computed(() => {
    const portfolio = this.portfolio();
    return portfolio ? historySubtitle(portfolio) : '';
  });
  protected readonly filtered = computed(() => {
    const { assetId, brokerId, assetType } = this.filters();
    return !!(assetId || brokerId || assetType);
  });
  protected readonly count = computed(() => {
    const operations = plural(this.portfolio()?.operationCount ?? 0, 'operação', 'operações');
    return this.filtered()
      ? `${this.total()} de ${operations}`
      : plural(this.total(), 'operação', 'operações');
  });
  protected readonly noResult = computed(() => {
    const filters = this.filters();
    return noResultTitle(
      filters,
      this.assets().find((a) => a.id === filters.assetId),
      this.brokers().find((b) => b.id === filters.brokerId),
    );
  });

  protected readonly chips: { label: string; type: AssetType | null }[] = [
    { label: 'Todos', type: null },
    ...CHIP_ORDER.map((type) => ({ label: ASSET_TYPE[type].many, type })),
  ];
  protected readonly select =
    'h-11 w-full rounded-md border border-strong bg-surface px-3 py-2 text-body-md text-primary md:w-65';
  protected readonly name = assetName;
  protected readonly date = formatDate;
  protected readonly money = formatMoney;
  protected readonly quantity = (operation: OperationDto) =>
    formatQuantity(operation.quantity, operation.asset.assetType);
  protected readonly typeLabel = (operation: OperationDto) =>
    operation.type === 'BUY' ? 'Compra' : 'Venda';

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      this.request?.unsubscribe();
    });
    this.load();
  }

  protected choose(key: 'assetId' | 'brokerId', event: Event): void {
    this.setFilters({ [key]: (event.target as HTMLSelectElement).value });
  }

  protected setFilters(change: Partial<OperationFilters>): void {
    this.filters.update((filters) => ({ ...filters, ...change }));
    this.loadOperations();
  }

  protected clearFilters(): void {
    this.setFilters(NO_FILTERS);
    this.focus('#filter-asset');
  }

  protected loadMore(): void {
    this.loadingMore.set(true);
    const next = this.page() + 1;
    this.request?.unsubscribe();
    this.request = this.service.list(this.id, this.filters(), next).subscribe({
      next: ({ items, total }) => {
        this.loadingMore.set(false);
        this.page.set(next);
        this.items.update((list) => [...list, ...items]);
        this.total.set(total);
      },
      error: (error: unknown) => {
        this.loadingMore.set(false);
        this.fail(error);
      },
    });
  }

  protected retry(): void {
    const header = !!this.portfolio();
    if (header) this.loadOperations();
    else this.load();
    this.focus(header ? 'h1' : '#history-loading');
    this.focusTitleOnLoad = !header;
  }

  /** Header, filter options and the first page together; the filters change only the list. */
  private load(): void {
    this.start();
    this.request = forkJoin({
      portfolio: this.portfoliosService.get(this.id),
      // shortcut: the asset filter lists the assets of GET positions, which leaves out one sold at exactly zero
      // profit (D41) and takes the History down when positions fails (500 on a corporate event, from the S2); an
      // endpoint of the portfolio's assets would fix both, if either comes up.
      positions: this.portfoliosService.positions(this.id),
      brokers: this.service.brokers(),
      page: this.service.list(this.id, this.filters(), 1),
    }).subscribe({
      next: ({ portfolio, positions, brokers, page }) => {
        this.portfolio.set(portfolio);
        this.assets.set(
          positions
            .map((p) => p.asset)
            .sort((a, b) => assetName(a).localeCompare(assetName(b), 'pt-BR')),
        );
        this.brokers.set(brokers);
        this.show(page.items, page.total);
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  private loadOperations(): void {
    this.start();
    this.request = this.service.list(this.id, this.filters(), 1).subscribe({
      next: ({ items, total }) => this.show(items, total),
      error: (error: unknown) => this.fail(error),
    });
  }

  private start(): void {
    // Cancels a pending "Carregar mais" too, which then never answers: its flag has to go down here.
    this.request?.unsubscribe();
    this.loadingMore.set(false);
    clearTimeout(this.timer);
    this.status.set('loading');
    this.slow.set(false);
    this.timer = setTimeout(() => this.slow.set(true), SKELETON_DELAY_MS);
  }

  private show(items: OperationDto[], total: number): void {
    clearTimeout(this.timer);
    this.page.set(1);
    this.items.set(items);
    this.total.set(total);
    this.status.set('ready');
    if (this.focusTitleOnLoad) this.focus('h1');
    this.focusTitleOnLoad = false;
  }

  /** 404: the portfolio does not exist or is another user's (RN02); anything else, the error card (U7a). */
  private fail(error: unknown): void {
    clearTimeout(this.timer);
    this.focusTitleOnLoad = false;
    const notFound = error instanceof HttpErrorResponse && error.status === 404;
    this.status.set(notFound ? 'not-found' : 'error');
    if (!notFound && !expectedFailure(error)) this.errors.handleError(error);
  }

  private focus(selector: string): void {
    afterNextRender(() => this.host.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}
