import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { EMPTY, Subject, catchError, debounceTime, map, of, switchMap } from 'rxjs';
import { AssetDto, AssetType } from '../../api/models';
import { ASSET_TYPE, assetName } from '../../shared/assets/asset-type';
import { Badge } from '../../shared/ui/badge';
import { AssetsService, SEARCH_DEBOUNCE_MS } from '../assets/assets.service';

/** The asset of the form: from the search, the catalog (with issuer) or the operation being edited (without). */
export interface AssetChoice {
  id: string;
  ticker: string | null;
  displayName: string;
  assetType: AssetType;
  issuer?: string | null;
}

/** "PETR4 · Petróleo Brasileiro S.A. – Petrobras" (frame 5); without the issuer, the name alone. */
export const assetLabel = (asset: AssetChoice): string =>
  asset.issuer ? `${assetName(asset)} · ${asset.issuer}` : assetName(asset);

/**
 * Field Ativo of the operation form (frame 5): a combobox that searches the catalog by ticker or issuer as the user
 * types (GET /assets?search=) and lists the suggestions (WAI-ARIA combobox with listbox: arrows, Enter, Esc). Typing
 * after a choice clears it, so the form never keeps an asset the field does not show.
 */
@Component({
  selector: 'app-asset-combobox',
  imports: [Badge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-1' },
  template: `
    <label id="operation-asset-label" for="operation-asset" class="text-label-md text-primary"
      >Ativo</label
    >
    <div class="relative">
      <input
        id="operation-asset"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="operation-asset-list"
        [attr.aria-expanded]="open()"
        [attr.aria-activedescendant]="active() < 0 ? null : 'operation-asset-' + active()"
        [attr.aria-invalid]="error() ? 'true' : null"
        [attr.aria-describedby]="error() ? 'operation-asset-hint' : null"
        autocomplete="off"
        maxlength="100"
        [value]="text()"
        class="h-11 w-full rounded-md bg-surface px-3 py-2 text-body-md text-primary"
        [class]="error() ? 'border-2 border-negative' : 'border border-strong'"
        (input)="typed($any($event.target).value)"
        (keydown)="key($event)"
        (blur)="leave()"
      />
      @if (open()) {
        <div
          class="absolute inset-x-0 top-full z-10 mt-1 flex flex-col rounded-md border border-default bg-surface py-1 shadow-overlay"
        >
          <ul
            id="operation-asset-list"
            role="listbox"
            aria-labelledby="operation-asset-label"
            class="max-h-80 overflow-y-auto"
          >
            @for (asset of results(); track asset.id; let i = $index) {
              <li
                [id]="'operation-asset-' + i"
                role="option"
                [attr.aria-selected]="i === active()"
                class="mx-1 flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2"
                [class.bg-primary-subtle]="i === active()"
                tabindex="-1"
                (mousedown)="$event.preventDefault()"
                (click)="pick(asset)"
                (keydown.enter)="pick(asset)"
              >
                <span class="text-label-md text-primary">{{ name(asset) }}</span>
                <span class="flex-1 truncate text-body-sm text-secondary">{{
                  asset.issuer ?? asset.displayName
                }}</span>
                <app-badge>{{ type(asset) }}</app-badge>
              </li>
            } @empty {
              <li
                role="option"
                aria-selected="false"
                aria-disabled="true"
                class="px-4 py-2 text-body-sm text-secondary"
              >
                Nenhum ativo encontrado para “{{ term() }}”
              </li>
            }
          </ul>
          <p class="px-4 pb-1 pt-2 text-caption text-secondary">
            Busca por código (ticker) ou nome da empresa ou fundo.
          </p>
        </div>
      }
    </div>
    @if (error(); as message) {
      <p id="operation-asset-hint" class="text-caption text-negative">{{ message }}</p>
    }
  `,
})
export class AssetCombobox {
  /** assetId of the form: the field sets it and marks it touched when left. */
  readonly control = input.required<FormControl<string>>();
  readonly asset = input<AssetChoice | null>(null);
  readonly error = input<string | null>(null);
  readonly assetChange = output<AssetChoice | null>();

  /**
   * The text of the field follows the chosen asset; when the asset goes away because the user typed, the typed text
   * stays, and when the form clears it (after saving), the field clears too.
   */
  protected readonly text = linkedSignal<AssetChoice | null, string>({
    source: this.asset,
    computation: (asset, previous) => {
      if (asset) return assetLabel(asset);
      const shownBefore = previous?.source ? assetLabel(previous.source) : '';
      return previous && previous.value !== shownBefore ? previous.value : '';
    },
  });
  protected readonly term = signal('');
  protected readonly results = signal<AssetDto[]>([]);
  protected readonly open = signal(false);
  protected readonly active = signal(-1);

  protected readonly name = assetName;
  protected readonly type = (asset: AssetDto) => ASSET_TYPE[asset.assetType].one;

  private readonly searches = new Subject<string>();

  constructor() {
    const service = inject(AssetsService);
    this.searches
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        // An empty field only cancels the pending search; a failed search lists nothing (the form still says what is
        // missing when saved).
        switchMap((term) =>
          term
            ? service.search(term, 1).pipe(
                map(({ items }) => ({ term, items })),
                catchError(() => of({ term, items: [] as AssetDto[] })),
              )
            : EMPTY,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ term, items }) => {
        this.term.set(term);
        this.results.set(items);
        this.active.set(-1);
        this.open.set(true);
      });
  }

  protected typed(value: string): void {
    this.text.set(value);
    if (this.asset()) this.choose(null);
    const term = value.trim();
    this.searches.next(term);
    if (!term) this.open.set(false);
  }

  protected key(event: KeyboardEvent): void {
    const count = this.results().length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!this.open() || !count) return;
      event.preventDefault();
      const current = this.active();
      if (event.key === 'ArrowDown') this.active.set((current + 1) % count);
      else this.active.set(current <= 0 ? count - 1 : current - 1);
    } else if (event.key === 'Enter' && this.open() && this.active() >= 0) {
      event.preventDefault(); // Enter picks the suggestion; it does not send the form
      this.pick(this.results()[this.active()]);
    } else if (event.key === 'Escape' && this.open()) {
      event.preventDefault();
      this.open.set(false);
    }
  }

  protected leave(): void {
    this.open.set(false);
    this.control().markAsTouched();
  }

  protected pick(asset: AssetDto): void {
    this.choose(asset);
    this.open.set(false);
  }

  private choose(asset: AssetChoice | null): void {
    const control = this.control();
    control.setValue(asset?.id ?? '');
    control.markAsDirty();
    this.assetChange.emit(asset);
  }
}
