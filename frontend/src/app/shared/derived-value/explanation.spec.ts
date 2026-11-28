import { DerivedValue, FormulaCode } from '../../api/models';
import {
  AVG_PRICE,
  GROSS,
  PETR4,
  PORTFOLIO_COST,
  PORTFOLIO_PROFIT,
  POSITION_PROFIT,
  SALE_PROFIT,
  TOTAL_BUY,
  TOTAL_COST,
} from '../../../testing/derived-values';
import { explain, triggerLabel } from './explanation';
import { FORMULA_TEXTS } from './microcopy.pt-BR';

const NBSP = String.fromCharCode(0xa0);
const plain = (value: string) => value.replaceAll(NBSP, ' ');
const rows = (value: DerivedValue, asset: typeof PETR4 | null = PETR4) =>
  explain({ value, asset }).rows.map((r) => ({ ...r, value: plain(r.value) }));

describe('explain (C1, the 9 formulaCode of the microcopy, section 3)', () => {
  it('has the texts of the 9 formulaCode of S1; the S1+ ones wait for UX-2 (D64)', () => {
    const codes: FormulaCode[] = [
      'AVG_PRICE_BUY',
      'TOTAL_COST',
      'REALIZED_PROFIT',
      'POSITION_REALIZED_PROFIT',
      'PORTFOLIO_TOTAL_COST',
      'PORTFOLIO_REALIZED_PROFIT',
      'OPERATION_GROSS',
      'OPERATION_TOTAL_BUY',
      'OPERATION_NET_SELL',
    ];
    const withText = Object.entries(FORMULA_TEXTS)
      .filter(([, texts]) => texts.label)
      .map(([code]) => code);
    expect(withText.sort()).toEqual(codes.sort());
  });

  it('AVG_PRICE_BUY: inputs by name and origin, intermediate PM with 4 places, no sum in the front', () => {
    const e = explain({ value: AVG_PRICE, asset: PETR4 });

    expect(e.heading).toBe('Preço médio (PM) · PETR4');
    expect(plain(e.value)).toBe('R$ 32,03');
    expect(rows(AVG_PRICE).map((r) => [r.label, r.origin, r.value])).toEqual([
      ['Quantidade antes da compra', 'Suas operações até 13/03/2026', '100'],
      ['PM antes da compra', 'Suas operações até 13/03/2026', 'R$ 30,00'],
      ['Quantidade comprada', 'Compra de 14/03/2026 · XP Investimentos', '50'],
      ['Preço unitário', 'Compra de 14/03/2026 · XP Investimentos', 'R$ 36,00'],
      ['Custos (corretagem e taxas)', 'Compra de 14/03/2026 · XP Investimentos', 'R$ 4,90'],
    ]);
    expect(e.account).toBe('(100 × 30,00 + 50 × 36,00 + 4,90) ÷ (100 + 50) = 32,03');
    expect(e.footer).toBe('Calculado em 30/10/2026 a partir das suas operações nesta carteira.');
  });

  it('TOTAL_COST links to the PM it multiplies', () => {
    const e = explain({ value: TOTAL_COST, asset: PETR4 });

    expect(e.account).toBe('100 × 32,0327 = 3.203,27');
    expect(e.rows[1]).toMatchObject({
      label: 'Preço médio',
      origin: 'Ver cálculo do preço médio',
      link: { value: AVG_PRICE, asset: PETR4 },
    });
  });

  it('REALIZED_PROFIT: signed value with tone, sale price label; estimated in the preview (D42)', () => {
    const e = explain({ value: SALE_PROFIT, asset: PETR4 });

    expect(plain(e.value)).toBe('+ R$ 293,47');
    expect(e.tone).toBe('positive');
    expect(e.rows[1].label).toBe('Preço de venda');
    expect(e.account).toBe('50 × 38,00 − 4,90 − 50 × 32,0327 = 293,47');

    const preview = explain({ value: SALE_PROFIT, asset: PETR4 }, true);
    expect(preview.heading).toBe('Lucro realizado estimado · PETR4');
    expect(preview.explanation).toMatch(/Vira lucro realizado quando você salvar a venda\.$/);
    expect(triggerLabel(SALE_PROFIT, true)).toBe('Como foi calculado: Lucro realizado estimado');
  });

  it('POSITION_REALIZED_PROFIT: one row per sale, and the account of the sale when there is one', () => {
    const e = explain({ value: POSITION_PROFIT, asset: PETR4 });

    expect(rows(POSITION_PROFIT)[0]).toMatchObject({
      label: 'Venda de 02/06/2026 · XP Investimentos',
      origin: 'Ver cálculo do lucro realizado',
      value: '+ R$ 293,47',
      tone: 'positive',
    });
    expect(e.account).toBe('50 × 38,00 − 4,90 − 50 × 32,0327 = 293,47');
  });

  it('PORTFOLIO_REALIZED_PROFIT: one row per asset, with its status, and the signed sum', () => {
    const e = explain({ value: PORTFOLIO_PROFIT, asset: null });

    expect(e.heading).toBe('Lucro realizado da carteira');
    expect(rows(PORTFOLIO_PROFIT, null).map((r) => [r.label, r.origin, r.value])).toEqual([
      ['PETR4', 'Posição aberta · ver cálculo do lucro realizado', '+ R$ 293,47'],
      ['MXRF11', 'Posição aberta · ver cálculo do lucro realizado', '− R$ 12,40'],
      ['WEGE3', 'Posição encerrada · ver cálculo do lucro realizado', '+ R$ 412,80'],
    ]);
    expect(e.rows[2].link?.asset?.ticker).toBe('WEGE3');
    expect(e.account).toBe('293,47 − 12,40 + 412,80 = 693,87');
  });

  it('PORTFOLIO_REALIZED_PROFIT without sales says so and sums to zero (microcopy, section 4)', () => {
    const e = explain({ value: { ...PORTFOLIO_PROFIT, value: '0', inputs: [] }, asset: null });

    expect(e.empty).toBe('Nenhuma venda com lucro ou prejuízo nesta carteira.');
    expect(plain(e.account)).toBe('= R$ 0,00');
  });

  it('PORTFOLIO_TOTAL_COST: plain money rows linking to the cost of each asset', () => {
    const e = explain({ value: PORTFOLIO_COST, asset: null });

    expect(rows(PORTFOLIO_COST, null)[0]).toMatchObject({
      label: 'PETR4',
      origin: 'Posição aberta · ver cálculo do custo total',
      value: 'R$ 3.203,27',
      tone: 'neutral',
    });
    expect(e.account).toBe('3.203,27 = 3.203,27');
  });

  it('OPERATION_GROSS and OPERATION_TOTAL_BUY of the preview: the form values are not saved yet', () => {
    expect(rows(GROSS).map((r) => [r.label, r.origin])).toEqual([
      ['Quantidade', 'Do formulário, ainda não salvo'],
      ['Preço unitário', 'Do formulário, ainda não salvo'],
    ]);
    const total = explain({ value: TOTAL_BUY, asset: PETR4 });
    expect(total.rows[0].origin).toBe('Ver cálculo do valor da operação');
    expect(total.account).toBe('1.800,00 + 4,90 = 1.804,90');
    expect(
      explain({
        value: { ...TOTAL_BUY, formulaCode: 'OPERATION_NET_SELL', value: '1795.1' },
        asset: PETR4,
      }).account,
    ).toBe('1.800,00 − 4,90 = 1.795,10');
  });

  it('a negative result keeps the typographic minus; an unknown source shows only the value', () => {
    const loss: DerivedValue = {
      ...SALE_PROFIT,
      value: '-12.4',
      inputs: [{ ...SALE_PROFIT.inputs[0], source: 'FORM' as never }],
    };
    const e = explain({ value: loss, asset: PETR4 });

    expect(e.account).toContain('= −12,40');
    expect(e.rows[0].origin).toBeNull();
    expect(e.account).toContain('50 × —'); // inputs the API left out are a dash, not a guess
  });
});
