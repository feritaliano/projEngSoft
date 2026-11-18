import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortfolioDto, PortfolioSummary, Position } from '../../api/models';
import { NotFoundPage } from '../../core/layout/not-found-page';
import { ASSET_TYPE, GROUP_ORDER, assetName } from '../../shared/assets/asset-type';
import {
  Tone,
  formatMoney,
  formatQuantity,
  formatSignedMoney,
  plural,
} from '../../shared/format/pt-br';
import { AssetAvatar } from '../../shared/ui/asset-avatar';
import { Badge } from '../../shared/ui/badge';
import { Icon } from '../../shared/ui/icon';
import { LoadError, SKELETON_DELAY_MS } from '../../shared/ui/load-error';
import { PortfolioHeader } from './portfolio-header';
import { PortfoliosService } from './portfolios.service';

/** Line below the name in the Detail (microcopy, section 11). */
export function detailSubtitle({ operationCount, assetCount }: PortfolioDto): string {
  if (operationCount === 0) return 'Nenhuma operação ainda';
  const operations = plural(operationCount, 'operação', 'operações');
  return assetCount === 0
    ? `${operations} · nenhuma posição aberta`
    : `${operations} · ${plural(assetCount, 'ativo', 'ativos')}`;
}

const TONE: Record<Tone, string> = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral: 'text-primary',
};

interface Detail {
  portfolio: PortfolioDto;
  summary: PortfolioSummary;
  positions: Position[];
}

/**
 * Frame 4, tab Resumo (B6, B7), single version (D48): only what has data in the S1. Market value, returns, charts,
 * allocation, "Carteira ideal" and the Proventos/Metas tabs stay out of the DOM until their stage. Every number
 * comes formatted from the API strings (RN11); the "como foi calculado" and "Lançar operação" come in the W4b.
 */
@Component({
  selector: 'app-portfolio-detail-page',
  imports: [NgTemplateOutlet, NotFoundPage, PortfolioHeader, AssetAvatar, Badge, Icon, LoadError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (status() === 'not-found') {
      <app-not-found-page />
    } @else {
      <div class="flex flex-col gap-6 pb-12 pt-4 md:pt-8">
        <app-portfolio-header [portfolio]="detail()?.portfolio ?? null" [subtitle]="subtitle()" />

        @switch (status()) {
          @case ('loading') {
            <div id="detail-loading" tabindex="-1" aria-busy="true" class="flex flex-col gap-4">
              @if (slow()) {
                <div class="grid gap-4 md:grid-cols-3" aria-hidden="true">
                  @for (kpi of [1, 2, 3]; track kpi) {
                    <div
                      class="flex flex-col gap-2 rounded-lg border border-default bg-surface p-5"
                    >
                      <div class="h-3 w-20 rounded-sm bg-subtle"></div>
                      <div class="h-6 w-32 rounded-sm bg-subtle"></div>
                    </div>
                  }
                </div>
                <div
                  class="flex h-60 flex-col gap-3 rounded-lg border border-default bg-surface p-5"
                  aria-hidden="true"
                >
                  <div class="h-3 w-55 max-w-full rounded-sm bg-subtle"></div>
                  <div class="h-4 w-100 max-w-full rounded-sm bg-subtle"></div>
                </div>
                <p class="text-caption text-secondary">
                  Calculando posições a partir das suas operações…
                </p>
              }
            </div>
          }
          @case ('error') {
            <app-load-error
              heading="Não conseguimos carregar esta carteira"
              text="O servidor teve um problema. Suas operações continuam salvas."
              (retry)="retry()"
            />
          }
          @default {
            @if (detail(); as d) {
              <dl class="grid gap-4 md:grid-cols-3">
                <div class="flex flex-col gap-1 rounded-lg border border-default bg-surface p-5">
                  <dt class="text-label-md text-secondary">Custo total</dt>
                  <dd class="text-numeric-lg tabular-nums text-primary">
                    {{ money(d.summary.totalCost.value) }}
                  </dd>
                </div>
                <div class="flex flex-col gap-1 rounded-lg border border-default bg-surface p-5">
                  <dt class="text-label-md text-secondary">Lucro realizado</dt>
                  @let profit = signed(d.summary.realizedProfit.value);
                  <dd class="text-numeric-lg tabular-nums" [class]="tone[profit.tone]">
                    {{ profit.text }}
                  </dd>
                </div>
                <div class="flex flex-col gap-1 rounded-lg border border-default bg-surface p-5">
                  <dt class="text-label-md text-secondary">Ativos em carteira</dt>
                  <dd class="flex flex-col gap-1">
                    <span class="text-numeric-lg tabular-nums text-primary">{{
                      d.summary.assetCount
                    }}</span>
                    @if (closedCaption(); as caption) {
                      <span class="text-caption text-secondary">{{ caption }}</span>
                    }
                  </dd>
                </div>
              </dl>

              @if (d.portfolio.operationCount === 0) {
                <section
                  class="flex flex-col items-center gap-4 rounded-lg border border-default bg-surface px-4 py-8 text-center md:p-12"
                >
                  <h2 class="text-heading-lg text-primary">
                    Esta carteira ainda não tem operações
                  </h2>
                  <p class="max-w-130 text-body-md text-secondary">
                    Lance sua primeira compra para ver posição, preço médio e custo total. Tudo aqui
                    é calculado a partir das operações que você lançar, e cada número mostra a conta
                    feita.
                  </p>
                </section>
              }

              @if (groups().length) {
                <section
                  aria-labelledby="positions-title"
                  class="flex flex-col rounded-lg border border-default bg-surface"
                >
                  <h2 id="positions-title" class="px-4 py-4 text-heading-md text-primary md:px-5">
                    Posições por classe
                  </h2>
                  <div class="hidden overflow-x-auto md:block">
                    <table class="w-full tabular-nums">
                      <caption class="sr-only">
                        Posições abertas, agrupadas por classe
                      </caption>
                      <ng-container [ngTemplateOutlet]="columns" />
                      @for (group of groups(); track group.type) {
                        <tbody>
                          <tr class="border-t border-default bg-canvas">
                            <th
                              scope="rowgroup"
                              colspan="5"
                              class="px-5 py-2 text-left text-label-sm text-secondary"
                            >
                              <span class="flex items-center gap-2">
                                <span
                                  class="size-2.5 rounded-full"
                                  [class]="classOf(group.type).dot"
                                ></span>
                                {{ classOf(group.type).many }}
                              </span>
                            </th>
                          </tr>
                          @for (row of group.rows; track row.asset.id) {
                            <ng-container
                              [ngTemplateOutlet]="tableRow"
                              [ngTemplateOutletContext]="{ $implicit: row }"
                            />
                          }
                        </tbody>
                      }
                      <tfoot>
                        <tr class="border-t border-default bg-canvas text-label-md text-primary">
                          <th scope="row" class="px-5 py-3 text-left">Total</th>
                          <td></td>
                          <td></td>
                          <td class="px-4 py-3 text-right">
                            {{ money(d.summary.totalCost.value) }}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div class="flex flex-col gap-4 px-4 pb-4 md:hidden">
                    @for (group of groups(); track group.type) {
                      <section
                        class="flex flex-col gap-3"
                        [attr.aria-label]="classOf(group.type).many"
                      >
                        <p class="flex items-center gap-2 text-label-sm text-secondary">
                          <span
                            class="size-2.5 rounded-full"
                            [class]="classOf(group.type).dot"
                          ></span>
                          {{ classOf(group.type).many }} ·
                          {{ plural(group.rows.length, 'ativo', 'ativos') }}
                        </p>
                        <ul class="flex flex-col gap-3">
                          @for (row of group.rows; track row.asset.id) {
                            <ng-container
                              [ngTemplateOutlet]="card"
                              [ngTemplateOutletContext]="{ $implicit: row }"
                            />
                          }
                        </ul>
                      </section>
                    }
                  </div>
                </section>
              }

              @if (closed().length) {
                <section class="flex flex-col rounded-lg border border-default bg-surface">
                  <div class="flex items-start gap-3 p-4 md:px-5">
                    <app-icon
                      name="open"
                      class="mt-0.5 text-secondary transition-transform duration-150 ease-out motion-reduce:transition-none"
                      [class.rotate-90]="showClosed()"
                    />
                    <div class="flex flex-1 flex-col gap-1">
                      <h2 id="closed-title" class="text-heading-sm text-primary">
                        Posições encerradas ({{ closed().length }})
                      </h2>
                      <p class="text-body-sm text-secondary">
                        Ativos que você vendeu por completo. O lucro realizado deles entra no total
                        da carteira.
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-controls="closed-positions"
                      aria-describedby="closed-title"
                      [attr.aria-expanded]="showClosed()"
                      class="min-h-11 rounded-sm px-2 text-label-md text-link hover:underline md:min-h-6"
                      (click)="showClosed.set(!showClosed())"
                    >
                      {{ showClosed() ? 'Recolher' : 'Mostrar' }}
                    </button>
                  </div>
                  <div id="closed-positions" [hidden]="!showClosed()">
                    <div class="hidden overflow-x-auto md:block">
                      <table class="w-full tabular-nums">
                        <caption class="sr-only">
                          Posições encerradas
                        </caption>
                        <ng-container [ngTemplateOutlet]="columns" />
                        <tbody>
                          @for (row of closed(); track row.asset.id) {
                            <ng-container
                              [ngTemplateOutlet]="tableRow"
                              [ngTemplateOutletContext]="{ $implicit: row }"
                            />
                          }
                        </tbody>
                      </table>
                    </div>
                    <ul class="flex flex-col gap-3 px-4 pb-4 md:hidden">
                      @for (row of closed(); track row.asset.id) {
                        <ng-container
                          [ngTemplateOutlet]="card"
                          [ngTemplateOutletContext]="{ $implicit: row }"
                        />
                      }
                    </ul>
                  </div>
                </section>
              }
            }
          }
        }
      </div>
    }

    <ng-template #columns>
      <thead class="bg-subtle text-label-sm text-secondary">
        <tr class="border-y border-default">
          <th scope="col" class="px-5 py-3 text-left">Ativo</th>
          <th scope="col" class="px-4 py-3 text-right">Quantidade</th>
          <th scope="col" class="px-4 py-3 text-right">Preço médio</th>
          <th scope="col" class="px-4 py-3 text-right">Custo total</th>
          <th scope="col" class="px-5 py-3 text-right">Lucro realizado</th>
        </tr>
      </thead>
    </ng-template>

    <ng-template #tableRow let-row>
      @let position = asPosition(row);
      @let profit = signed(position.realizedProfit.value);
      <!-- Top borders only: the table collapses them, and the last row meets the border of the card. -->
      <tr class="border-t border-default text-numeric-md text-primary">
        <th scope="row" class="px-5 py-3 text-left font-normal">
          <ng-container
            [ngTemplateOutlet]="asset"
            [ngTemplateOutletContext]="{ $implicit: position }"
          />
        </th>
        <td class="px-4 py-3 text-right">{{ quantity(position) }}</td>
        <td class="px-4 py-3 text-right">{{ moneyOrDash(position.averagePrice?.value) }}</td>
        <td class="px-4 py-3 text-right">{{ moneyOrDash(position.totalCost?.value) }}</td>
        <td class="px-5 py-3 text-right" [class]="tone[profit.tone]">{{ profit.text }}</td>
      </tr>
    </ng-template>

    <ng-template #card let-row>
      @let position = asPosition(row);
      @let profit = signed(position.realizedProfit.value);
      <li class="flex flex-col gap-3 rounded-lg border border-default p-4">
        <ng-container
          [ngTemplateOutlet]="asset"
          [ngTemplateOutletContext]="{ $implicit: position }"
        />
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 tabular-nums">
          <div>
            <dt class="text-caption text-secondary">Quantidade</dt>
            <dd class="text-numeric-md text-primary">{{ quantity(position) }}</dd>
          </div>
          <div>
            <dt class="text-caption text-secondary">Preço médio</dt>
            <dd class="text-numeric-md text-primary">
              {{ moneyOrDash(position.averagePrice?.value) }}
            </dd>
          </div>
          <div>
            <dt class="text-caption text-secondary">Custo total</dt>
            <dd class="text-numeric-md text-primary">
              {{ moneyOrDash(position.totalCost?.value) }}
            </dd>
          </div>
          <div>
            <dt class="text-caption text-secondary">Lucro realizado</dt>
            <dd class="text-numeric-md" [class]="tone[profit.tone]">{{ profit.text }}</dd>
          </div>
        </dl>
      </li>
    </ng-template>

    <ng-template #asset let-row>
      @let position = asPosition(row);
      <span class="flex items-center gap-3">
        <app-asset-avatar [asset]="position.asset" />
        <span class="text-label-md text-primary">{{ name(position) }}</span>
        <app-badge>{{ classOf(position.asset.assetType).one }}</app-badge>
      </span>
    </ng-template>
  `,
})
export class PortfolioDetailPage {
  private readonly service = inject(PortfoliosService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  protected readonly detail = signal<Detail | null>(null);
  protected readonly status = signal<'loading' | 'error' | 'not-found' | 'ready'>('loading');
  protected readonly slow = signal(false);
  protected readonly showClosed = signal(false);

  protected readonly subtitle = computed(() => {
    const detail = this.detail();
    return detail ? detailSubtitle(detail.portfolio) : '';
  });
  /** Open positions by class, in the order of the frame; a class without positions does not show. */
  protected readonly groups = computed(() => {
    const open = this.detail()?.positions.filter((p) => p.status === 'OPEN') ?? [];
    return GROUP_ORDER.map((type) => ({
      type,
      rows: open.filter((p) => p.asset.assetType === type),
    })).filter((group) => group.rows.length);
  });
  protected readonly closed = computed(
    () => this.detail()?.positions.filter((p) => p.status === 'CLOSED') ?? [],
  );
  protected readonly closedCaption = computed(() => {
    const count = this.closed().length;
    if (count) return plural(count, 'posição encerrada', 'posições encerradas');
    return this.detail()?.summary.assetCount === 0 ? 'Nenhuma posição' : '';
  });

  protected readonly tone = TONE;
  protected readonly money = formatMoney;
  protected readonly signed = formatSignedMoney;
  protected readonly plural = plural;
  protected readonly classOf = (type: Position['asset']['assetType']) => ASSET_TYPE[type];
  protected readonly asPosition = (row: Position) => row;
  protected readonly name = (row: Position) => assetName(row.asset);
  protected readonly quantity = (row: Position) =>
    formatQuantity(row.quantity, row.asset.assetType);
  /** Closed position: average price and total cost come null (RN08). */
  protected readonly moneyOrDash = (value?: string) => (value ? formatMoney(value) : '—');

  constructor() {
    this.load();
  }

  protected retry(): void {
    this.load();
    afterNextRender(() => this.host.querySelector<HTMLElement>('#detail-loading')?.focus(), {
      injector: this.injector,
    });
  }

  /** The three calls together: any failure shows the whole error, without the name (U7a). */
  private load(): void {
    this.status.set('loading');
    this.slow.set(false);
    const timer = setTimeout(() => this.slow.set(true), SKELETON_DELAY_MS);
    forkJoin({
      portfolio: this.service.get(this.id),
      summary: this.service.summary(this.id),
      positions: this.service.positions(this.id),
    }).subscribe({
      next: (detail) => {
        clearTimeout(timer);
        this.detail.set(detail);
        this.status.set('ready');
      },
      error: (error: unknown) => {
        clearTimeout(timer);
        // 404 also for another user's portfolio or a malformed id (RN02).
        const notFound = error instanceof HttpErrorResponse && error.status === 404;
        this.status.set(notFound ? 'not-found' : 'error');
      },
    });
  }
}
