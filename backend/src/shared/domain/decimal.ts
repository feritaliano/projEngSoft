import BaseDecimal from 'decimal.js';
import { InvalidValueError } from './domain-error';

/**
 * Decimal of the whole domain (RN11, D5): 40 significant digits, so an average price of a repeating fraction keeps far
 * more precision than the 2 (money) to 8 (crypto quantity) decimal places shown. Rounding happens only in presentation.
 */
export const Decimal = BaseDecimal.clone({
  precision: 40,
  rounding: BaseDecimal.ROUND_HALF_EVEN,
});
export type Decimal = BaseDecimal;

/** Values enter the domain as decimal strings or Decimal, never as JavaScript numbers (binary floating point). */
export type DecimalInput = string | Decimal;

// Plain decimal notation only: decimal.js would also accept "1e3", "0x1f", "Infinity" and "NaN".
const PLAIN_DECIMAL = /^-?\d+(\.\d+)?$/;

export function toDecimal(value: DecimalInput, field: string): Decimal {
  if (typeof value === 'string') {
    if (!PLAIN_DECIMAL.test(value)) {
      throw new InvalidValueError(
        field,
        'must be a plain decimal string (e.g. "1234.56")',
      );
    }
    return new Decimal(value);
  }
  // Runtime guard: values typed loosely (JSON bodies, database rows) must not reach the domain as numbers or null.
  if (!Decimal.isDecimal(value)) {
    throw new InvalidValueError(field, 'must be a decimal string or Decimal');
  }
  if (!value.isFinite()) {
    throw new InvalidValueError(field, 'must be a finite number');
  }
  // Re-wrapped so arithmetic uses the domain precision even if the caller built it with another Decimal config.
  return new Decimal(value);
}
