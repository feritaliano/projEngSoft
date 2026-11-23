import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AssetType, FieldErrorCode, FieldErrorParams } from '../../api/models';
import { coded } from '../../shared/forms/field-errors.pt-BR';
import { todayInSaoPaulo } from '../../shared/format/pt-br';

// RN04, D55 and the OpenAPI of CreateOperationDto: the client checks are for convenience (the server checks again)
// and answer with the codes of the API, so the text under the field is the same (D56). Strings only, no number (RN11).

interface DecimalRule {
  /** Fees may be zero; quantity and price must be greater than zero. */
  zero: boolean;
  maxDecimals: number;
  /** The code of too many decimal places, with its params for the text. */
  decimals: FieldErrorCode;
  params: FieldErrorParams;
}

/** At most 12 digits before the point (NUMERIC of the schema). */
const MAX_INTEGER_DIGITS = 12;

const WHOLE: DecimalRule = { zero: false, maxDecimals: 0, decimals: 'NOT_INTEGER', params: {} };
export const QUANTITY_RULES: Record<AssetType, DecimalRule> = {
  STOCK: WHOLE,
  FII: WHOLE,
  ETF: WHOLE,
  BDR: WHOLE,
  FIXED_INCOME: { zero: false, maxDecimals: 2, decimals: 'INVALID_STEP', params: { step: '0.01' } },
  CRYPTO: {
    zero: false,
    maxDecimals: 8,
    decimals: 'TOO_MANY_DECIMALS',
    params: { maxDecimals: 8 },
  },
};
export const PRICE_RULE: DecimalRule = {
  zero: false,
  maxDecimals: 8,
  decimals: 'TOO_MANY_DECIMALS',
  params: { maxDecimals: 8 },
};
export const FEES_RULE: DecimalRule = {
  zero: true,
  maxDecimals: 2,
  decimals: 'TOO_MANY_DECIMALS',
  params: { maxDecimals: 2 },
};

/**
 * What the user typed, in pt-BR, as the decimal string of the API: "1.234,56" → "1234.56". Without a comma, the dot is
 * the decimal point ("0.5"), so a value pasted from elsewhere still works.
 */
export const toApiDecimal = (typed: string): string => {
  const text = typed.trim().replaceAll(' ', '');
  return text.includes(',') ? text.replaceAll('.', '').replace(',', '.') : text;
};

const API_DECIMAL = /^-?\d+(\.\d+)?$/;

/** The code of the API for a typed decimal under `rule`, or null when it is valid. */
export function decimalError(typed: string, rule: DecimalRule): ValidationErrors | null {
  if (!typed.trim()) return coded('REQUIRED');
  const value = toApiDecimal(typed);
  if (!API_DECIMAL.test(value)) return coded('INVALID_FORMAT');
  if (value.startsWith('-')) return coded(rule.zero ? 'NEGATIVE' : 'NOT_POSITIVE', rule.params);
  if (!rule.zero && !/[1-9]/.test(value)) return coded('NOT_POSITIVE', rule.params);
  const [whole, fraction = ''] = value.split('.');
  if (whole.replace(/^0+/, '').length > MAX_INTEGER_DIGITS) {
    return coded('TOO_LARGE', { maxIntegerDigits: MAX_INTEGER_DIGITS });
  }
  if (fraction.replace(/0+$/, '').length > rule.maxDecimals)
    return coded(rule.decimals, rule.params);
  return null;
}

export const decimalValidator =
  (rule: () => DecimalRule): ValidatorFn =>
  ({ value }: AbstractControl<string>) =>
    decimalError(value, rule());

/** Trade date: required and not after today in São Paulo (RN04, D54). */
export const tradeDateValidator: ValidatorFn = ({ value }: AbstractControl<string>) => {
  if (!value) return coded('REQUIRED');
  const today = todayInSaoPaulo();
  return value > today ? coded('FUTURE_DATE', { today }) : null;
};

const decimals = (min: number, max: number) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
    useGrouping: false,
  });
const MONEY_FIELD = decimals(2, 8);
const FEES_FIELD = decimals(2, 2);
const WHOLE_FIELD = decimals(0, 0);
const QUANTITY_FIELD: Record<AssetType, Intl.NumberFormat> = {
  STOCK: WHOLE_FIELD,
  FII: WHOLE_FIELD,
  ETF: WHOLE_FIELD,
  BDR: WHOLE_FIELD,
  FIXED_INCOME: decimals(2, 2),
  CRYPTO: decimals(0, 8),
};

// A field value is typed back as is, so no thousands separator: "1500", "36,00" (Intl formats the string, RN11).
const field = (format: Intl.NumberFormat, value: string) =>
  format.format(value as Intl.StringNumericLiteral);

/** An API decimal as the form shows it in the edit mode (handoff U5: quantity by class, money with 2 places). */
export const quantityField = (value: string, assetType: AssetType) =>
  field(QUANTITY_FIELD[assetType], value);
export const priceField = (value: string) => field(MONEY_FIELD, value);
export const feesField = (value: string) => field(FEES_FIELD, value);
