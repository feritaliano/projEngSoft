import { Decimal, DecimalInput, toDecimal } from './decimal';

/**
 * Amount in BRL with full Decimal precision (RN11). Signed: a realized profit can be negative. Rules about sign
 * (price > 0, fees >= 0) belong to whoever uses the amount, not to Money.
 */
export class Money {
  private constructor(private readonly amount: Decimal) {}

  static of(value: DecimalInput, field = 'amount'): Money {
    return new Money(toDecimal(value, field));
  }

  static zero(): Money {
    return new Money(new Decimal(0));
  }

  get value(): Decimal {
    return this.amount;
  }

  plus(other: Money): Money {
    return new Money(this.amount.plus(other.amount));
  }

  minus(other: Money): Money {
    return new Money(this.amount.minus(other.amount));
  }

  /** Amount multiplied by a plain factor (e.g. quantity × unit price). */
  times(factor: Decimal): Money {
    return new Money(this.amount.times(factor));
  }

  /** Amount divided by a non-zero factor (e.g. total cost ÷ quantity = average price). */
  dividedBy(divisor: Decimal): Money {
    if (divisor.isZero()) {
      throw new RangeError('Money cannot be divided by zero');
    }
    return new Money(this.amount.dividedBy(divisor));
  }

  isZero(): boolean {
    return this.amount.isZero();
  }

  isNegative(): boolean {
    return this.amount.lessThan(0);
  }

  isPositive(): boolean {
    return this.amount.greaterThan(0);
  }

  equals(other: Money): boolean {
    return this.amount.equals(other.amount);
  }

  /** Rounded for display (half-up, as on a brokerage note). Never use the result for further calculation. */
  toFixed(decimalPlaces: number): string {
    const rounded = this.amount.toDecimalPlaces(
      decimalPlaces,
      Decimal.ROUND_HALF_UP,
    );
    // A tiny negative leftover of a 40-digit division (e.g. -1e-38) must not print as "-0.00".
    return (rounded.isZero() ? new Decimal(0) : rounded).toFixed(decimalPlaces);
  }

  /** Full precision, plain notation (what the API sends as a string). */
  toString(): string {
    return this.amount.toFixed();
  }

  /** JSON as the decimal string (API contract, RN11), not the private field. */
  toJSON(): string {
    return this.toString();
  }
}
