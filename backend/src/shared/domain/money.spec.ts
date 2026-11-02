import { Decimal } from './decimal';
import { Money } from './money';

describe('Money (RN11)', () => {
  it('adds, subtracts, multiplies and divides with full precision', () => {
    const price = Money.of('10.10');

    expect(price.plus(Money.of('0.05')).toString()).toBe('10.15');
    expect(price.minus(Money.of('20')).toString()).toBe('-9.9');
    expect(price.times(new Decimal(3)).toString()).toBe('30.3');
    expect(Money.of('1').dividedBy(new Decimal(3)).toFixed(10)).toBe(
      '0.3333333333',
    );
  });

  it('refuses to divide by zero', () => {
    expect(() => Money.of('1').dividedBy(new Decimal(0))).toThrow(RangeError);
  });

  it('tells the sign apart, with zero neither positive nor negative', () => {
    expect([
      Money.of('-0.01').isNegative(),
      Money.of('-0.01').isPositive(),
    ]).toEqual([true, false]);
    expect([
      Money.of('0.01').isNegative(),
      Money.of('0.01').isPositive(),
    ]).toEqual([false, true]);
    expect([
      Money.zero().isNegative(),
      Money.zero().isPositive(),
      Money.zero().isZero(),
    ]).toEqual([false, false, true]);
  });

  it('compares by value', () => {
    expect(Money.of('1.50').equals(Money.of('1.5'))).toBe(true);
    expect(Money.of('1.50').equals(Money.of('1.51'))).toBe(false);
  });

  it('rounds half-up only when formatting for display', () => {
    expect(Money.of('2.345').toFixed(2)).toBe('2.35');
    expect(Money.of('-2.345').toFixed(2)).toBe('-2.35');
    expect(Money.of('2.344').toFixed(2)).toBe('2.34');
  });

  it('never prints a negative zero for a tiny leftover of a 40-digit division', () => {
    expect(
      Money.of('-0.000000000000000000000000000000000000001').toFixed(2),
    ).toBe('0.00');
  });

  it('exposes the Decimal value and names the field in errors', () => {
    expect(Money.of('7.25').value.toFixed()).toBe('7.25');
    expect(() => Money.of('abc', 'fees')).toThrow(/^fees must be/);
  });

  it('serializes as the full-precision decimal string (RN11)', () => {
    expect(JSON.stringify({ price: Money.of('32.0326666') })).toBe(
      '{"price":"32.0326666"}',
    );
  });
});
