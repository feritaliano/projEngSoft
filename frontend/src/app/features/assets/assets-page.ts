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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { Subscription, debounceTime } from 'rxjs';
import { AssetDto } from '../../api/models';
import { ASSET_TYPE, assetName } from '../../shared/assets/asset-type';
import { plural } from '../../shared/format/pt-br';
import { AssetAvatar } from '../../shared/ui/asset-avatar';
import { Badge } from '../../shared/ui/badge';
import { Button } from '../../shared/ui/button';
import { LoadError, SKELETON_DELAY_MS, expectedFailure } from '../../shared/ui/load-error';
import { TextField } from '../../shared/ui/text-field';
import { AssetsService, CATALOG_PAGE_SIZE, SEARCH_MAX_LENGTH } from './assets.service';

/** Typing pause before searching (as the preview of the form, D42). */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Frame 7, asset catalog (C1): search by ticker or issuer name; code, name (issuer), sector and class of each asset.
 * shortcut: no type chips (GET /assets has no type filter); add them when the API has one.
 */
@Component({
  selector: 'app-assets-page',
  imports: [AssetAvatar, Badge, Button, LoadError, TextField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 pb-12 pt-4 md:pt-8">
      <div class="flex flex-col gap-1">
        <h1 tabindex="-1" class="text-heading-lg text-primary md:text-heading-xl">Ativos</h1>
        <p class="text-body-md text-secondary">
          Ações, FIIs, ETFs e BDRs negociados na B3. Busque por código (ticker) ou pelo nome da
          empresa ou do fundo.
        </p>
      </div>

      <app-text-field
        class="md:w-120"
        label="Buscar ativo"
        fieldId="asset-search"
        type="search"
        autocomplete="off"
        [maxLength]="searchMaxLength"
        [control]="search"
      />

      @if (status() === 'error') {
        <app-load-error
          heading="Não conseguimos buscar os ativos"
          text="O servidor teve um problema. Sua busca continua no campo: tente de novo em instantes."
          (retry)="retry()"
        />
      } @else {
        @if (term()) {
          <p aria-live="polite" class="text-body-sm text-secondary">
            {{ status() === 'loading' ? 'Buscando “' + term() + '”…' : found() }}
          </p>
        }
        @if (status() === 'loading') {
          <div aria-busy="true">
            @if (slow()) {
              <div
                class="flex flex-col gap-4 rounded-lg border border-default bg-surface p-5"
                aria-hidden="true"
              >
                @for (row of [1, 2, 3]; track row) {
                  <div class="flex gap-6">
                    <div class="h-3.5 w-25 rounded-sm bg-subtle"></div>
                    <div class="h-3.5 flex-1 rounded-sm bg-subtle"></div>
                    <div class="h-3.5 w-20 rounded-sm bg-subtle"></div>
                  </div>
                }
              </div>
              @if (!term()) {
                <p class="sr-only">Carregando…</p>
              }
            }
          </div>
        } @else if (!items().length) {
          <section
            class="flex flex-col items-center gap-3 rounded-lg border border-default bg-surface p-10 text-center"
          >
            <h2 class="text-heading-md text-primary">
              Nenhum ativo encontrado para “{{ term() }}”
            </h2>
            <p class="max-w-130 text-body-md text-secondary">
              Confira o código: tickers têm 4 letras e 1 ou 2 números, como PETR4 ou MXRF11. Você
              também pode buscar pelo nome da empresa ou do fundo.
            </p>
            <button appButton variant="secondary" type="button" (click)="clear()">
              Limpar busca
            </button>
          </section>
        } @else {
          <div class="hidden overflow-x-auto rounded-lg border border-default bg-surface md:block">
            <table class="w-full">
              <caption class="sr-only">
                Ativos do catálogo, em ordem alfabética
              </caption>
              <thead class="bg-subtle text-label-sm text-secondary">
                <tr class="border-b border-default">
                  <th scope="col" class="px-5 py-3 text-left">Código</th>
                  <th scope="col" class="px-4 py-3 text-left">Nome</th>
                  <th scope="col" class="px-4 py-3 text-left">Setor</th>
                  <th scope="col" class="px-5 py-3 text-left">Tipo</th>
                </tr>
              </thead>
              <tbody>
                @for (asset of items(); track asset.id) {
                  <tr class="border-b border-default last:border-b-0">
                    <th scope="row" class="px-5 py-3 text-left font-normal">
                      <span
                        class="flex items-center gap-3 whitespace-nowrap text-label-md text-primary"
                      >
                        <app-asset-avatar [asset]="asset" />
                        {{ code(asset) }}
                      </span>
                    </th>
                    <td
                      class="max-w-80 truncate px-4 py-3 text-body-md text-primary"
                      [title]="name(asset)"
                    >
                      {{ name(asset) }}
                    </td>
                    <td class="px-4 py-3 text-body-sm text-secondary">{{ sector(asset) }}</td>
                    <td class="px-5 py-3">
                      <app-badge>{{ type(asset) }}</app-badge>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <ul class="flex flex-col gap-3 md:hidden">
            @for (asset of items(); track asset.id) {
              <li class="flex flex-col gap-2 rounded-lg border border-default bg-surface p-4">
                <span class="flex items-center gap-2 text-label-md text-primary">
                  <app-asset-avatar [asset]="asset" />
                  {{ code(asset) }}
                  <app-badge>{{ type(asset) }}</app-badge>
                </span>
                <p class="truncate text-body-md text-primary" [title]="name(asset)">
                  {{ name(asset) }}
                </p>
                <p class="text-caption text-secondary">{{ sector(asset) }}</p>
              </li>
            }
          </ul>
          <nav
            aria-label="Páginas do catálogo"
            class="flex flex-wrap items-center gap-4 text-body-sm text-secondary"
          >
            <span class="flex-1">Ordem alfabética · {{ pageSize }} por página</span>
            @if (page() > 1) {
              <button appButton variant="ghost" type="button" (click)="turnPage(page() - 1)">
                <span aria-hidden="true">←</span> Página anterior
              </button>
            }
            @if (hasNext()) {
              <button appButton variant="ghost" type="button" (click)="turnPage(page() + 1)">
                Próxima página <span aria-hidden="true">→</span>
              </button>
            }
          </nav>
        }
      }
    </div>
  `,
})
export class AssetsPage {
  private readonly service = inject(AssetsService);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly errors = inject(ErrorHandler);
  private request?: Subscription;
  private timer?: ReturnType<typeof setTimeout>;
  /** The page buttons are destroyed while loading, so the focus goes to the title when the page arrives. */
  private focusTitleOnLoad = false;

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly term = signal('');
  protected readonly page = signal(1);
  protected readonly items = signal<AssetDto[]>([]);
  private readonly total = signal(0);
  protected readonly status = signal<'loading' | 'error' | 'ready'>('loading');
  protected readonly slow = signal(false);

  protected readonly found = computed(
    () => `${plural(this.total(), 'ativo encontrado', 'ativos encontrados')} para “${this.term()}”`,
  );
  protected readonly hasNext = computed(() => this.page() * CATALOG_PAGE_SIZE < this.total());

  protected readonly pageSize = CATALOG_PAGE_SIZE;
  protected readonly searchMaxLength = SEARCH_MAX_LENGTH;
  protected readonly code = assetName;
  /** Issuer; crypto has none, so its name (D50). */
  protected readonly name = (asset: AssetDto) => asset.issuer ?? asset.displayName;
  protected readonly sector = (asset: AssetDto) => asset.sector ?? 'Sem classificação na B3';
  protected readonly type = (asset: AssetDto) => ASSET_TYPE[asset.assetType].one;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      this.request?.unsubscribe();
    });
    this.search.valueChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed())
      .subscribe(() => this.goTo(1));
    this.load();
  }

  protected turnPage(page: number): void {
    this.goTo(page);
    this.focusTitleOnLoad = true;
  }

  private goTo(page: number): void {
    this.focusTitleOnLoad = false;
    this.page.set(page);
    this.load();
  }

  protected clear(): void {
    this.search.setValue('', { emitEvent: false });
    this.goTo(1);
    this.focus('#asset-search');
  }

  protected retry(): void {
    this.load();
    this.focus('h1');
  }

  private load(): void {
    this.request?.unsubscribe();
    clearTimeout(this.timer);
    this.term.set(this.search.value.trim());
    this.status.set('loading');
    this.slow.set(false);
    this.timer = setTimeout(() => this.slow.set(true), SKELETON_DELAY_MS);
    this.request = this.service.search(this.term(), this.page()).subscribe({
      next: ({ items, total }) => {
        clearTimeout(this.timer);
        this.items.set(items);
        this.total.set(total);
        this.status.set('ready');
        if (this.focusTitleOnLoad) this.focus('h1');
        this.focusTitleOnLoad = false;
      },
      // Any failure, connection included (the shell banner shows it too): the card lets the user search again.
      error: (error: unknown) => {
        clearTimeout(this.timer);
        this.status.set('error');
        if (!expectedFailure(error)) this.errors.handleError(error);
      },
    });
  }

  private focus(selector: string): void {
    afterNextRender(() => this.host.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}
