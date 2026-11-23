import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperationType, RuleViolation } from '../../api/models';
import { assetName } from '../assets/asset-type';
import { formatDate, formatQuantity } from '../format/pt-br';

/**
 * What the user did (handoff, C2): the API does not say which action caused an RN10, so the screen tells it. `date` is
 * the date of the form (create) or of the operation before the change (edit, delete), as YYYY-MM-DD.
 */
export type RuleContext =
  | { action: 'create'; date: string }
  | { action: 'edit'; type: OperationType; date: string }
  | { action: 'delete'; date: string }
  | { action: 'change-asset'; asset: string };

export interface RuleTexts {
  title: string;
  sentence: string;
  rows: [string, string][];
  resolve: string;
  /** "Ver venda de {data} →": only on RN10, to the sale that would exceed the position (microcopy, section 8). */
  link: string | null;
}

/** claude/microcopy.md, section 8: only `availableQuantity`, `soldQuantity` and the sale come from the API. */
export function ruleTexts(violation: RuleViolation, context: RuleContext): RuleTexts {
  const { operation } = violation;
  const asset = assetName(operation.asset);
  const quantity = (value: string) => formatQuantity(value, operation.asset.assetType);
  const available = quantity(violation.availableQuantity);
  const sold = quantity(violation.soldQuantity);
  const saleDate = formatDate(operation.tradeDate);

  if (violation.rule === 'RN07') {
    return {
      title: 'A venda é maior que a sua posição',
      sentence: `Em ${saleDate} você tinha ${available} ${asset} nesta carteira e a venda é de ${sold}. Nada foi salvo.`,
      rows: [
        ['Operação', `Venda de ${sold} ${asset} · ${saleDate}`],
        ['Posição disponível na data', available],
        ['Quantidade da venda', sold],
      ],
      resolve: `Como resolver: reduza a quantidade para até ${available} ou lance antes a compra que está faltando.`,
      link: null,
    };
  }

  const rows: [string, string][] = [
    ['Operação afetada', `Venda de ${sold} ${asset} · ${saleDate} · ${operation.broker.name}`],
    ['Posição disponível na data', available],
    ['Quantidade vendida', sold],
  ];
  const link = `Ver venda de ${saleDate}`;
  switch (context.action) {
    case 'create':
      return {
        title: 'Esta venda deixaria uma venda posterior maior que a posição',
        sentence: `Lançar esta venda em ${formatDate(context.date)} faz a venda de ${saleDate} ficar maior que a posição. Nada foi salvo.`,
        rows,
        resolve: `Como resolver: reduza a quantidade desta venda, lance antes a compra que está faltando ou edite a venda de ${saleDate}.`,
        link,
      };
    case 'edit': {
      const buy = context.type === 'BUY';
      return {
        title: 'Esta alteração deixaria uma venda maior que a posição',
        sentence: `Com esta alteração na ${buy ? 'compra' : 'venda'} de ${formatDate(context.date)}, a venda de ${saleDate} fica maior que a posição. Nada foi salvo.`,
        rows,
        resolve: `Como resolver: ${buy ? 'aumente a quantidade desta compra' : 'reduza a quantidade desta venda'} ou edite antes a venda de ${saleDate}.`,
        link,
      };
    }
    case 'delete':
      return {
        title: 'Esta exclusão deixaria uma venda maior que a posição',
        sentence: `Excluir a compra de ${formatDate(context.date)} faz a venda de ${saleDate} ficar maior que a posição. Nada foi apagado.`,
        rows,
        resolve: `Como resolver: edite ou exclua antes a venda de ${saleDate}, ou mantenha esta compra.`,
        link,
      };
    case 'change-asset':
      return {
        title: 'Trocar o ativo deixaria uma venda maior que a posição',
        sentence: `Tirar esta compra de ${context.asset} faz a venda de ${saleDate} de ${context.asset} ficar maior que a posição. Nada foi salvo.`,
        rows,
        resolve: `Como resolver: mantenha ${context.asset} nesta compra ou edite antes a venda de ${saleDate}.`,
        link,
      };
  }
}

/** Text under the field Quantidade while there is a violation (microcopy, section 8). */
export function quantityHint({ rule, operation, availableQuantity, soldQuantity }: RuleViolation) {
  const available = formatQuantity(availableQuantity, operation.asset.assetType);
  if (rule === 'RN07') return `Máximo de ${available} nesta data.`;
  const sold = formatQuantity(soldQuantity, operation.asset.assetType);
  return `Afeta a venda de ${formatDate(operation.tradeDate)}: ${sold} vendidas, ${available} disponíveis.`;
}

/**
 * BusinessRuleError (C2): an operation that would leave a sell above the position (RN07, RN10), with the data of the
 * `violation` (the 422 or the preview, D42). After saving it is an alert; in the preview it is announced politely, so
 * it does not interrupt the typing (handoff U5).
 */
@Component({
  selector: 'app-business-rule-error',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = texts();
    <section
      [attr.role]="live() === 'alert' ? 'alert' : null"
      [attr.aria-live]="live() === 'polite' ? 'polite' : null"
      class="flex gap-3 rounded-lg border border-negative bg-negative-subtle p-4"
    >
      <span
        aria-hidden="true"
        class="flex size-5 shrink-0 items-center justify-center rounded-full bg-negative text-label-sm text-on-primary"
        >!</span
      >
      <div class="flex flex-1 flex-col gap-3">
        <h2 class="text-heading-sm text-negative">{{ t.title }}</h2>
        <p class="text-body-sm text-primary">{{ t.sentence }}</p>
        <dl class="flex flex-col gap-1 rounded-md bg-surface px-3 py-2 text-body-sm">
          @for (row of t.rows; track row[0]) {
            <div class="flex flex-wrap justify-between gap-x-4">
              <dt class="text-secondary">{{ row[0] }}</dt>
              <dd class="tabular-nums text-primary">{{ row[1] }}</dd>
            </div>
          }
        </dl>
        <p class="text-body-sm text-primary">{{ t.resolve }}</p>
        @if (t.link && violation().operation.id; as id) {
          <a
            [routerLink]="['/carteiras', portfolioId(), 'historico']"
            [queryParams]="{ operacao: id }"
            class="inline-flex min-h-11 items-center self-start text-label-md text-link hover:underline md:min-h-6"
            >{{ t.link }} <span aria-hidden="true">→</span></a
          >
        }
      </div>
    </section>
  `,
})
export class BusinessRuleError {
  readonly violation = input.required<RuleViolation>();
  readonly context = input.required<RuleContext>();
  readonly portfolioId = input.required<string>();
  /** 'alert' after a 422; 'polite' in the preview. */
  readonly live = input<'alert' | 'polite'>('alert');

  protected readonly texts = computed(() => ruleTexts(this.violation(), this.context()));
}
