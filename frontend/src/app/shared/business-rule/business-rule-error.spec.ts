import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RuleViolation } from '../../api/models';
import { text } from '../../../testing/text';
import { BusinessRuleError, RuleContext, quantityHint, ruleTexts } from './business-rule-error';

// Cases of the handoff ("Massa de dados dos frames"): RN07 = sell 150 PETR4 with 100; RN10 = the MXRF11 sale of 22/05.
const RN07: RuleViolation = {
  rule: 'RN07',
  operation: {
    id: null,
    type: 'SELL',
    tradeDate: '2026-10-28',
    quantity: '150',
    asset: { id: 'a1', ticker: 'PETR4', displayName: 'PETR4', assetType: 'STOCK' },
    broker: { id: 'b1', name: 'XP Investimentos' },
  },
  availableQuantity: '100',
  soldQuantity: '150',
};
const RN10: RuleViolation = {
  rule: 'RN10',
  operation: {
    id: 'o7',
    type: 'SELL',
    tradeDate: '2026-05-22',
    quantity: '50',
    asset: { id: 'a2', ticker: 'MXRF11', displayName: 'MXRF11', assetType: 'FII' },
    broker: { id: 'b2', name: 'NuInvest' },
  },
  availableQuantity: '40',
  soldQuantity: '50',
};

describe('ruleTexts (microcopy, section 8)', () => {
  it('RN07: the sale of the form passes the position, without link', () => {
    const t = ruleTexts(RN07, { action: 'create', date: '2026-10-28' });

    expect(t.title).toBe('A venda é maior que a sua posição');
    expect(t.sentence).toBe(
      'Em 28/10/2026 você tinha 100 PETR4 nesta carteira e a venda é de 150. Nada foi salvo.',
    );
    expect(t.rows).toEqual([
      ['Operação', 'Venda de 150 PETR4 · 28/10/2026'],
      ['Posição disponível na data', '100'],
      ['Quantidade da venda', '150'],
    ]);
    expect(t.resolve).toBe(
      'Como resolver: reduza a quantidade para até 100 ou lance antes a compra que está faltando.',
    );
    expect(t.link).toBeNull();
  });

  it('RN10 by the 4 actions of the user: same table and link, the text of each action', () => {
    const texts = (context: RuleContext) => ruleTexts(RN10, context);
    const edit = texts({ action: 'edit', type: 'BUY', date: '2026-01-08' });

    expect(edit.title).toBe('Esta alteração deixaria uma venda maior que a posição');
    expect(edit.sentence).toBe(
      'Com esta alteração na compra de 08/01/2026, a venda de 22/05/2026 fica maior que a posição. Nada foi salvo.',
    );
    expect(edit.resolve).toBe(
      'Como resolver: aumente a quantidade desta compra ou edite antes a venda de 22/05/2026.',
    );
    expect(edit.rows[0]).toEqual([
      'Operação afetada',
      'Venda de 50 MXRF11 · 22/05/2026 · NuInvest',
    ]);
    expect(edit.rows[2]).toEqual(['Quantidade vendida', '50']);
    expect(edit.link).toBe('Ver venda de 22/05/2026');

    expect(texts({ action: 'edit', type: 'SELL', date: '2026-05-01' }).resolve).toContain(
      'reduza a quantidade desta venda',
    );
    expect(texts({ action: 'create', date: '2026-05-15' }).sentence).toBe(
      'Lançar esta venda em 15/05/2026 faz a venda de 22/05/2026 ficar maior que a posição. Nada foi salvo.',
    );
    expect(texts({ action: 'delete', date: '2026-01-08' })).toMatchObject({
      title: 'Esta exclusão deixaria uma venda maior que a posição',
      sentence:
        'Excluir a compra de 08/01/2026 faz a venda de 22/05/2026 ficar maior que a posição. Nada foi apagado.',
    });
    expect(texts({ action: 'change-asset', asset: 'MXRF11' })).toMatchObject({
      title: 'Trocar o ativo deixaria uma venda maior que a posição',
      resolve: 'Como resolver: mantenha MXRF11 nesta compra ou edite antes a venda de 22/05/2026.',
    });
  });

  it('gives the help text of the field Quantidade for each rule', () => {
    expect(quantityHint(RN07)).toBe('Máximo de 100 nesta data.');
    expect(quantityHint(RN10)).toBe('Afeta a venda de 22/05/2026: 50 vendidas, 40 disponíveis.');
  });

  it('formats the quantities by the class of the asset (handoff U5)', () => {
    const crypto: RuleViolation = {
      ...RN07,
      operation: {
        ...RN07.operation,
        asset: { id: 'a3', ticker: 'BTC', displayName: 'Bitcoin', assetType: 'CRYPTO' },
      },
      availableQuantity: '0.01250000',
      soldQuantity: '0.02',
    };

    expect(ruleTexts(crypto, { action: 'create', date: '2026-10-28' }).rows[1][1]).toBe('0,0125');
  });
});

@Component({
  imports: [BusinessRuleError],
  template: `<app-business-rule-error
    [violation]="violation()"
    [context]="{ action: 'edit', type: 'BUY', date: '2026-01-08' }"
    portfolioId="p1"
    [live]="live()"
  />`,
})
class Host {
  readonly violation = signal(RN10);
  readonly live = signal<'alert' | 'polite'>('alert');
}

describe('BusinessRuleError (C2)', () => {
  const render = async (violation: RuleViolation, live: 'alert' | 'polite') => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.violation.set(violation);
    fixture.componentInstance.live.set(live);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('is an alert after saving and links to the sale of the RN10 in the History', async () => {
    const element = await render(RN10, 'alert');
    const section = element.querySelector('section')!;
    const link = element.querySelector('a')!;

    expect(section.getAttribute('role')).toBe('alert');
    expect(section.getAttribute('aria-live')).toBeNull();
    expect(text(section)).toContain('Esta alteração deixaria uma venda maior que a posição');
    expect(link.getAttribute('href')).toBe('/carteiras/p1/historico?operacao=o7');
    expect(text(link)).toBe('Ver venda de 22/05/2026 →');
  });

  it('is polite in the preview (D42) and has no link on RN07', async () => {
    const element = await render(RN07, 'polite');
    const section = element.querySelector('section')!;

    expect(section.getAttribute('role')).toBeNull();
    expect(section.getAttribute('aria-live')).toBe('polite');
    expect(element.querySelector('a')).toBeNull();
  });
});
