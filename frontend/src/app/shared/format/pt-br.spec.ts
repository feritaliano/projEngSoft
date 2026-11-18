import { formatDate, formatMoney, formatQuantity, formatSignedMoney, plural } from './pt-br';

// Intl puts a no-break space (U+00A0) between the currency and the number.
const NBSP = String.fromCharCode(0xa0);
const text = (value: string) => value.replaceAll(NBSP, ' ');

describe('pt-BR formatting (RN11: from the decimal string, no conversion to number)', () => {
  it('formats money with 2 places, rounding the full precision of the API', () => {
    expect(text(formatMoney('16151.27'))).toBe('R$ 16.151,27');
    expect(text(formatMoney('32.0326666666666666666666666666666666666667'))).toBe('R$ 32,03');
    expect(text(formatMoney('0'))).toBe('R$ 0,00');
  });

  it('keeps digits beyond the precision of a double', () => {
    expect(text(formatMoney('12345678901234567.89'))).toBe('R$ 12.345.678.901.234.567,89');
  });

  it('signs gains with + and losses with the typographic minus, and tells the tone', () => {
    expect(formatSignedMoney('693.87')).toEqual({ text: `+ R$${NBSP}693,87`, tone: 'positive' });
    expect(formatSignedMoney('-12.4')).toEqual({ text: `− R$${NBSP}12,40`, tone: 'negative' });
    expect(formatSignedMoney('0')).toEqual({ text: `R$${NBSP}0,00`, tone: 'neutral' });
    expect(formatSignedMoney('-0.001')).toEqual({ text: `R$${NBSP}0,00`, tone: 'neutral' });
  });

  it('formats the quantity by asset class (handoff U5)', () => {
    expect(formatQuantity('1500', 'STOCK')).toBe('1.500');
    expect(formatQuantity('150', 'FII')).toBe('150');
    expect(formatQuantity('0.52', 'FIXED_INCOME')).toBe('0,52');
    expect(formatQuantity('1', 'FIXED_INCOME')).toBe('1,00');
    expect(formatQuantity('0.01250000', 'CRYPTO')).toBe('0,0125');
    expect(formatQuantity('1', 'CRYPTO')).toBe('1');
    expect(formatQuantity('0.00000001', 'CRYPTO')).toBe('0,00000001');
  });

  it('formats an ISO date as dd/mm/aaaa', () => {
    expect(formatDate('2026-10-28')).toBe('28/10/2026');
  });

  it('pluralizes by count', () => {
    expect(plural(1, 'operação', 'operações')).toBe('1 operação');
    expect(plural(0, 'operação', 'operações')).toBe('0 operações');
  });
});
