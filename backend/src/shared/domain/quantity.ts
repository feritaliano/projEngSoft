import { InvalidValueError } from './domain-error';
import { Decimal, DecimalInput, toDecimal } from './decimal';

/**
 * Number of units of an asset, never negative. Decimal, not integer: renda fixa and cripto have fractional quantities
 * (D44, D50). Whether a value is allowed for an asset class (integer, 0.01, 8 places) is RN04, checked separately.
 */
export class Quantity {
  private constructor(private readonly units: Decimal) {}

  static of(value: DecimalInput, field = 'quantity'): Quantity {
    const units = toDecimal(value, field);
    if (units.lessThan(0)) {
      throw new InvalidValueError(field, 'must not be negative');
    }
    // -0 becomes 0, so equality and printing never show a negative zero.
    return new Quantity(units.isZero() ? new Decimal(0) : units);
  }

  static zero(): Quantity {
    return new Quantity(new Decimal(0));
  }

  get value(): Decimal {
    return this.units;
  }

  plus(other: Quantity): Quantity {
    return new Quantity(this.units.plus(other.units));
  }

  /** Throws if the result would be negative: callers check availability first (RN07). */
  minus(other: Quantity): Quantity {
    return Quantity.of(this.units.minus(other.units));
  }

  isZero(): boolean {
    return this.units.isZero();
  }

  isGreaterThan(other: Quantity): boolean {
    return this.units.greaterThan(other.units);
  }

  equals(other: Quantity): boolean {
    return this.units.equals(other.units);
  }

  decimalPlaces(): number {
    return this.units.decimalPlaces();
  }

  toString(): string {
    return this.units.toFixed();
  }

  toJSON(): string {
    return this.toString();
  }
}
