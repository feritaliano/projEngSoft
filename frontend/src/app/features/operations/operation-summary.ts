import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { OperationPreview, OperationType } from '../../api/models';
import { assetName } from '../../shared/assets/asset-type';
import { DerivedValueExplainer } from '../../shared/derived-value/derived-value-explainer';
import {
  EXPLAINER_TEXTS,
  FORMULA_TEXTS,
  SUMMARY_TEXTS,
} from '../../shared/derived-value/microcopy.pt-BR';
import {
  formatDate,
  formatMoney,
  formatQuantity,
  formatSignedMoney,
} from '../../shared/format/pt-br';
import { Button } from '../../shared/ui/button';
import { AssetChoice } from './asset-combobox';

/** States of the Resumo da operação (D42, handoff U5/U7a); "calculating" only after 300 ms without the answer. */
export type SummaryState =
  | { kind: 'waiting' }
  | { kind: 'calculating' }
  | { kind: 'ready'; preview: OperationPreview }
  | { kind: 'unavailable' }
  | { kind: 'gone' };

/** The operation the preview was asked for, in the API format (strings, RN11). */
export interface SummaryOperation {
  type: OperationType;
  tradeDate: string;
  quantity: string;
  unitPrice: string;
  fees: string;
  asset: AssetChoice;
}

const TONES = { positive: 'text-positive', negative: 'text-negative', neutral: 'text-primary' };

/**
 * Resumo da operação (frame 5, D42): what the backend previews before saving, nothing computed here. With a violation
 * the border is negative and the lines the backend could not compute show "—" (RN07: no position after, no PM line,
 * the note instead of the profit; RN10: the values and the note).
 */
@Component({
  selector: 'app-operation-summary',
  imports: [NgTemplateOutlet, Button, DerivedValueExplainer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let s = state();
    <section
      aria-labelledby="operation-summary-title"
      aria-live="polite"
      [attr.aria-busy]="s.kind === 'calculating' ? 'true' : null"
      class="flex flex-col gap-3 rounded-lg border bg-surface p-5"
      [class]="violation() ? 'border-negative' : 'border-default'"
    >
      <h2 id="operation-summary-title" class="text-heading-sm text-primary">{{ texts.title }}</h2>
      @switch (s.kind) {
        @case ('waiting') {
          <p class="text-caption text-secondary">{{ texts.waiting }}</p>
        }
        @case ('unavailable') {
          <p class="text-caption text-secondary">{{ texts.unavailable }}</p>
          <button appButton variant="ghost" type="button" class="self-start" (click)="retry.emit()">
            {{ texts.retry }}
          </button>
        }
        @case ('gone') {
          <p class="text-caption text-secondary">{{ texts.gone }}</p>
        }
        @default {
          @let p = s.kind === 'ready' ? s.preview : null;
          @let o = operation();
          <p class="text-caption text-secondary">
            {{ p ? texts.header : texts.calculating }}
          </p>
          <dl class="flex flex-col gap-3 tabular-nums">
            <div class="flex items-start gap-3">
              <dt class="flex flex-1 flex-col gap-1">
                <span class="text-body-sm text-secondary">{{ grossLabel }}</span>
                @if (o) {
                  <span class="text-caption text-secondary">{{ caption() }}</span>
                }
              </dt>
              <dd class="flex items-center gap-1 text-numeric-md text-primary">
                @if (p) {
                  {{ money(p.grossAmount.value) }}
                  <app-derived-value-explainer
                    [value]="p.grossAmount"
                    [asset]="o?.asset ?? null"
                    [preview]="true"
                  />
                } @else {
                  <ng-container [ngTemplateOutlet]="skeleton" />
                }
              </dd>
            </div>
            <div class="flex items-start gap-3">
              <dt class="flex-1 text-body-sm text-secondary">{{ texts.fees }}</dt>
              <dd class="text-numeric-md text-primary">
                @if (p && o) {
                  {{ money(o.fees) }}
                } @else {
                  <ng-container [ngTemplateOutlet]="skeleton" />
                }
              </dd>
            </div>
            <div class="flex items-start gap-3">
              <dt class="flex-1 text-label-md text-primary">{{ netLabel() }}</dt>
              <dd class="flex items-center gap-1 text-heading-sm text-primary">
                @if (p) {
                  {{ money(p.netAmount.value) }}
                  <app-derived-value-explainer
                    [value]="p.netAmount"
                    [asset]="o?.asset ?? null"
                    [preview]="true"
                  />
                } @else {
                  <ng-container [ngTemplateOutlet]="skeleton" />
                }
              </dd>
            </div>
          </dl>
          <hr class="border-default" />
          @if (o) {
            <p class="text-label-sm uppercase text-secondary">{{ heading() }}</p>
          }
          <dl class="flex flex-col gap-3 tabular-nums">
            <div class="flex items-start gap-3">
              <dt class="flex-1 text-body-sm text-secondary">{{ positionLabel() }}</dt>
              <dd class="text-numeric-md text-primary">
                @if (p) {
                  {{ quantity(p.positionBefore) }} → {{ quantity(p.positionAfter) }}
                } @else {
                  <ng-container [ngTemplateOutlet]="skeleton" />
                }
              </dd>
            </div>
            @if (violation()?.rule !== 'RN07') {
              <div class="flex items-start gap-3">
                <dt class="flex-1 text-body-sm text-secondary">{{ texts.averagePrice }}</dt>
                <dd class="flex items-center gap-1 text-numeric-md text-primary">
                  @if (p) {
                    @if (o?.type === 'SELL') {
                      {{ sellAverage(p) }}
                    } @else {
                      {{ moneyOrDash(p.averagePriceBefore?.value) }} →
                      {{ moneyOrDash(p.averagePriceAfter?.value) }}
                      @if (p.averagePriceAfter; as after) {
                        <app-derived-value-explainer
                          [value]="after"
                          [asset]="o?.asset ?? null"
                          [preview]="true"
                        />
                      }
                    }
                  } @else {
                    <ng-container [ngTemplateOutlet]="skeleton" />
                  }
                </dd>
              </div>
            }
            @if (o?.type === 'SELL') {
              <div class="flex items-start gap-3">
                <dt class="flex-1 text-body-sm text-secondary">{{ profitLabel }}</dt>
                <dd class="flex items-center gap-1 text-numeric-md">
                  @if (p) {
                    @if (p.realizedProfit; as profit) {
                      @let signed = signedMoney(profit.value);
                      <span [class]="tones[signed.tone]">{{ signed.text }}</span>
                      <app-derived-value-explainer
                        [value]="profit"
                        [asset]="o.asset"
                        [preview]="true"
                      />
                    } @else {
                      <span class="text-primary">—</span>
                    }
                  } @else {
                    <ng-container [ngTemplateOutlet]="skeleton" />
                  }
                </dd>
              </div>
            }
          </dl>
          @if (note(); as text) {
            <p class="text-body-sm text-negative">{{ text }}</p>
          }
        }
      }
    </section>

    <ng-template #skeleton>
      <span class="block h-3 w-17 rounded-sm bg-subtle" aria-hidden="true"></span>
    </ng-template>
  `,
})
export class OperationSummary {
  readonly state = input.required<SummaryState>();
  /** The operation of the last preview asked; null while the form is not valid. */
  readonly operation = input<SummaryOperation | null>(null);
  /** For the line "Na carteira {nome}, …" of a new operation; the edit mode names the asset instead. */
  readonly portfolioName = input('');
  readonly editing = input(false);
  readonly retry = output();

  protected readonly texts = SUMMARY_TEXTS;
  protected readonly tones = TONES;
  protected readonly grossLabel = FORMULA_TEXTS.OPERATION_GROSS.label;
  protected readonly profitLabel = EXPLAINER_TEXTS.estimatedLabel;
  protected readonly money = formatMoney;
  protected readonly signedMoney = formatSignedMoney;
  protected readonly moneyOrDash = (value?: string | null) => (value ? formatMoney(value) : '—');

  protected readonly violation = computed(() => {
    const state = this.state();
    return state.kind === 'ready' ? (state.preview.violation ?? null) : null;
  });
  protected readonly netLabel = computed(() =>
    this.operation()?.type === 'SELL'
      ? FORMULA_TEXTS.OPERATION_NET_SELL.label
      : FORMULA_TEXTS.OPERATION_TOTAL_BUY.label,
  );
  protected readonly caption = computed(() => {
    const operation = this.operation();
    return operation
      ? `${formatQuantity(operation.quantity, operation.asset.assetType)} × ${formatMoney(operation.unitPrice)}`
      : '';
  });
  protected readonly heading = computed(() => {
    const operation = this.operation();
    if (!operation) return '';
    const date = formatDate(operation.tradeDate);
    return this.editing()
      ? SUMMARY_TEXTS.editHeading(assetName(operation.asset), date)
      : SUMMARY_TEXTS.createHeading(this.portfolioName(), date, operation.type);
  });
  protected readonly positionLabel = computed(() => {
    const operation = this.operation();
    return SUMMARY_TEXTS.position(operation ? assetName(operation.asset) : '');
  });
  protected readonly note = computed(() => {
    const violation = this.violation();
    if (!violation) return null;
    const { assetType } = violation.operation.asset;
    const available = formatQuantity(violation.availableQuantity, assetType);
    const sold = formatQuantity(violation.soldQuantity, assetType);
    const date = formatDate(violation.operation.tradeDate);
    return violation.rule === 'RN07'
      ? SUMMARY_TEXTS.rn07(date, available, sold)
      : SUMMARY_TEXTS.rn10(date, available, sold);
  });

  /** Before → after; null (RN07, or a timeline broken earlier) is "—". */
  protected quantity(value: string | null): string {
    const asset = this.operation()?.asset;
    return value && asset ? formatQuantity(value, asset.assetType) : '—';
  }

  /** A sell keeps the PM (RN06): one value, "R$ 32,03 (venda não muda)". */
  protected sellAverage(preview: OperationPreview): string {
    const before = preview.averagePriceBefore?.value;
    return before ? SUMMARY_TEXTS.sellKeepsAverage(formatMoney(before)) : '—';
  }
}
