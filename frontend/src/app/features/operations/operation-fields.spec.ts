import { FormControl } from '@angular/forms';
import {
  FEES_RULE,
  PRICE_RULE,
  QUANTITY_RULES,
  decimalError,
  feesField,
  priceField,
  quantityField,
  toApiDecimal,
  tradeDateValidator,
} from './operation-fields';

const code = (typed: string, rule = PRICE_RULE) => decimalError(typed, rule)?.['coded'];

describe('operation fields (RN04, D55, D56)', () => {
  it('turns the pt-BR typing into the decimal string of the API, without number', () => {
    expect(toApiDecimal('1.234,56')).toBe('1234.56');
    expect(toApiDecimal(' 36,00 ')).toBe('36.00');
    expect(toApiDecimal('0.5')).toBe('0.5');
    expect(toApiDecimal('50')).toBe('50');
  });

  it('answers with the codes of the API', () => {
    expect(code('')).toEqual({ code: 'REQUIRED', params: undefined });
    expect(code('abc')?.code).toBe('INVALID_FORMAT');
    expect(code('0')).toEqual({ code: 'NOT_POSITIVE', params: { maxDecimals: 8 } });
    expect(code('-1')?.code).toBe('NOT_POSITIVE');
    expect(code('0,123456789')).toEqual({ code: 'TOO_MANY_DECIMALS', params: { maxDecimals: 8 } });
    expect(code('1234567890123')).toEqual({
      code: 'TOO_LARGE',
      params: { maxIntegerDigits: 12 },
    });
    expect(code('000000000000036,10')).toBeUndefined(); // leading zeros are not digits of the value
    expect(code('36,10')).toBeUndefined();
  });

  it('quantity by class: whole for stocks, steps of 0,01 for fixed income, 8 places for crypto (D55)', () => {
    expect(code('1,5', QUANTITY_RULES.STOCK)?.code).toBe('NOT_INTEGER');
    expect(code('150,00', QUANTITY_RULES.FII)).toBeUndefined();
    expect(code('0,525', QUANTITY_RULES.FIXED_INCOME)).toEqual({
      code: 'INVALID_STEP',
      params: { step: '0.01' },
    });
    expect(code('0,52', QUANTITY_RULES.FIXED_INCOME)).toBeUndefined();
    expect(code('0,00000001', QUANTITY_RULES.CRYPTO)).toBeUndefined();
    expect(code('0,000000001', QUANTITY_RULES.CRYPTO)?.code).toBe('TOO_MANY_DECIMALS');
  });

  it('fees may be zero but not negative nor with more than 2 places', () => {
    expect(code('0', FEES_RULE)).toBeUndefined();
    expect(code('-1', FEES_RULE)?.code).toBe('NEGATIVE');
    expect(code('4,901', FEES_RULE)).toEqual({
      code: 'TOO_MANY_DECIMALS',
      params: { maxDecimals: 2 },
    });
  });

  it('refuses a date after today in São Paulo (D54)', () => {
    expect(tradeDateValidator(new FormControl(''))?.['coded'].code).toBe('REQUIRED');
    expect(tradeDateValidator(new FormControl('2026-01-08'))).toBeNull();
    expect(tradeDateValidator(new FormControl('9999-12-31'))?.['coded'].code).toBe('FUTURE_DATE');
  });

  it('shows API values in the fields without thousands separator (edit mode)', () => {
    expect(quantityField('1500', 'STOCK')).toBe('1500');
    expect(quantityField('0.52', 'FIXED_INCOME')).toBe('0,52');
    expect(quantityField('0.01250000', 'CRYPTO')).toBe('0,0125');
    expect(priceField('10.1')).toBe('10,10');
    expect(priceField('1234.123456')).toBe('1234,123456');
    expect(feesField('4')).toBe('4,00');
  });
});
