import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OperationPreview, RuleViolation } from '../../api/models';
import { AVG_PRICE, GROSS, PETR4, SALE_PROFIT, TOTAL_BUY } from '../../../testing/derived-values';
import { text } from '../../../testing/text';
import { OperationSummary, SummaryOperation, SummaryState } from './operation-summary';

const BUY: SummaryOperation = {
  type: 'BUY',
  tradeDate: '2026-10-28',
  quantity: '50',
  unitPrice: '36.00',
  fees: '4.90',
  asset: PETR4,
};
const SELL: SummaryOperation = { ...BUY, type: 'SELL', unitPrice: '38.50' };
const BEFORE = { ...AVG_PRICE, value: '32.0326666' };
const BOUGHT: OperationPreview = {
  grossAmount: GROSS,
  netAmount: TOTAL_BUY,
  positionBefore: '100',
  positionAfter: '150',
  averagePriceBefore: BEFORE,
  averagePriceAfter: { ...AVG_PRICE, value: '33.3866' },
};
const SOLD: OperationPreview = {
  ...BOUGHT,
  netAmount: { ...TOTAL_BUY, formulaCode: 'OPERATION_NET_SELL', value: '1920.1' },
  positionAfter: '50',
  averagePriceAfter: BEFORE,
  realizedProfit: { ...SALE_PROFIT, value: '318.47' },
};
const RN07: RuleViolation = {
  rule: 'RN07',
  operation: {
    id: null,
    type: 'SELL',
    tradeDate: '2026-10-28',
    quantity: '150',
    asset: PETR4,
    broker: { id: 'b1', name: 'XP Investimentos' },
  },
  availableQuantity: '100',
  soldQuantity: '150',
};

@Component({
  imports: [OperationSummary],
  template: `<app-operation-summary
    [state]="state()"
    portfolioName="Longo prazo"
    [editing]="editing()"
    (retry)="retries.set(retries() + 1)"
  />`,
})
class Host {
  readonly state = signal<SummaryState>({ kind: 'waiting' });
  readonly editing = signal(false);
  readonly retries = signal(0);
}

describe('OperationSummary (frame 5, D42)', () => {
  const NBSP = String.fromCharCode(0xa0);
  /** The state as the form builds it: "calculating" and "ready" carry the operation they describe. */
  type Shown =
    | Exclude<SummaryState, { kind: 'calculating' | 'ready' }>
    | { kind: 'calculating' }
    | { kind: 'ready'; preview: OperationPreview };
  const render = async (
    shown: Shown,
    operation: SummaryOperation | null = BUY,
    editing = false,
  ) => {
    const fixture = TestBed.createComponent(Host);
    const state =
      shown.kind === 'ready' || shown.kind === 'calculating'
        ? ({ ...shown, operation: operation ?? BUY } as SummaryState)
        : shown;
    fixture.componentInstance.state.set(state);
    fixture.componentInstance.editing.set(editing);
    await fixture.whenStable();
    const section = (fixture.nativeElement as HTMLElement).querySelector('section')!;
    return { fixture, section, shown: () => text(section).replaceAll(NBSP, ' ') };
  };

  it('waits for the valid fields, announcing politely', async () => {
    const { section, shown } = await render({ kind: 'waiting' }, null);

    expect(section.getAttribute('aria-live')).toBe('polite');
    expect(shown()).toBe(
      'Resumo da operação Preencha ativo, corretora, data, quantidade e preço para ver o valor da operação e como ela muda sua posição.',
    );
  });

  it('shows "Calculando…" with the fixed labels and no values (U7a)', async () => {
    const { section, shown } = await render({ kind: 'calculating' });

    expect(section.getAttribute('aria-busy')).toBe('true');
    expect(shown()).toContain('Calculando…');
    expect(shown()).toContain('Valor da operação 50 × R$ 36,00');
    expect(shown()).not.toContain('R$ 1.800,00');
    expect(section.querySelectorAll('span.bg-subtle').length).toBeGreaterThan(0);
  });

  it('shows the values of a buy as the API sends them, each with its ⓘ', async () => {
    const { section, shown } = await render({ kind: 'ready', preview: BOUGHT });

    expect(shown()).toBe(
      'Resumo da operação Calculado pelo servidor a partir das suas operações. Nada foi salvo ainda. ' +
        'Valor da operação 50 × R$ 36,00 R$ 1.800,00 ⓘ Custos R$ 4,90 Total com custos R$ 1.804,90 ⓘ ' +
        'Na carteira Longo prazo, em 28/10/2026, após esta compra Posição de PETR4 100 → 150 ' +
        'Preço médio R$ 32,03 → R$ 33,39 ⓘ',
    );
    expect(
      [...section.querySelectorAll('button')].map((b) => b.getAttribute('aria-label')),
    ).toEqual([
      'Como foi calculado: Valor da operação',
      'Como foi calculado: Total com custos',
      'Como foi calculado: Preço médio (PM)',
    ]);
    expect(section.className).toContain('border-default');
  });

  it('shows the sell: net value, PM that does not change and the estimated profit (RN06)', async () => {
    const { section, shown } = await render({ kind: 'ready', preview: SOLD }, SELL);

    expect(shown()).toContain('Valor líquido R$ 1.920,10');
    expect(shown()).toContain('após esta venda');
    expect(shown()).toContain('Preço médio R$ 32,03 (venda não muda)');
    expect(shown()).toContain('Lucro realizado estimado + R$ 318,47 ⓘ');
    expect(section.querySelector('.text-positive')).not.toBeNull();
  });

  it('RN07: negative border, position "→ —", no PM line, the note instead of the profit', async () => {
    const preview = {
      ...SOLD,
      positionAfter: null,
      averagePriceAfter: null,
      realizedProfit: null,
      violation: RN07,
    };
    const { section, shown } = await render({ kind: 'ready', preview }, SELL);

    expect(section.className).toContain('border-negative');
    expect(shown()).toContain('Posição de PETR4 100 → —');
    expect(shown()).not.toContain('Preço médio');
    // Microcopy, section 9: the note takes the place of the value of the estimated profit.
    expect(shown()).toMatch(
      /Lucro realizado estimado Venda maior que a posição em 28\/10\/2026: 100 disponíveis, 150 na venda\.$/,
    );
  });

  it('RN10 in the edit mode: all the values, the note and the heading with the asset', async () => {
    const violation: RuleViolation = {
      ...RN07,
      rule: 'RN10',
      operation: { ...RN07.operation, id: 'o7', tradeDate: '2026-05-22', quantity: '50' },
      availableQuantity: '40',
      soldQuantity: '50',
    };
    const { section, shown } = await render(
      { kind: 'ready', preview: { ...BOUGHT, violation } },
      BUY,
      true,
    );

    expect(shown()).toContain('PETR4 em 28/10/2026, com a alteração');
    // The note is a dd of the PM: a <dl> holds only dt/dd groups (axe only-dlitems, WCAG 1.3.1).
    expect(section.querySelectorAll('dl > :not(div), dl > div > :not(dt, dd)')).toHaveLength(0);
    expect(shown()).toContain('Preço médio R$ 32,03 → R$ 33,39');
    // Handoff U5: the note goes right below the average price.
    expect(shown()).toMatch(
      /R\$ 33,39 ⓘ Deixa a venda de 22\/05\/2026 maior que a posição: 40 disponíveis, 50 vendidas\.$/,
    );
  });

  it('shows "—" for the PM before a first buy (microcopy, section 4)', async () => {
    const { shown } = await render({
      kind: 'ready',
      preview: { ...BOUGHT, positionBefore: '0', averagePriceBefore: null },
    });

    expect(shown()).toContain('Posição de PETR4 0 → 150');
    expect(shown()).toContain('Preço médio — → R$ 33,39');
  });

  it('offers "Calcular de novo" when the preview is unavailable', async () => {
    const { fixture, section, shown } = await render({ kind: 'unavailable' });

    expect(shown()).toBe(
      'Resumo da operação Não deu para calcular o resumo agora. Você ainda pode salvar: o servidor confere tudo de novo ao salvar. Calcular de novo',
    );
    section.querySelector('button')!.click();
    expect(fixture.componentInstance.retries()).toBe(1);
  });

  it('says there is no summary when the operation no longer exists', async () => {
    const { shown } = await render({ kind: 'gone' }, null, true);

    expect(shown()).toBe('Resumo da operação Sem resumo: esta operação não existe mais.');
  });
});
