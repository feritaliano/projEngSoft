import { Decimal } from './decimal';
import { InvalidValueError } from './domain-error';
import { Quantity } from './quantity';

describe('Quantity', () => {
  it('accepts zero and positive decimals, fractional for cripto and renda fixa (D44)', () => {
    expect(Quantity.of('0').isZero()).toBe(true);
    expect(Quantity.of('0.00000001').toString()).toBe('0.00000001');
    expect(Quantity.of(new Decimal('150')).value.toFixed()).toBe('150');
  });

  it('normalizes negative zero to zero', () => {
    expect(Quantity.of(new Decimal('-0')).toString()).toBe('0');
  });

  it('rejects negative values', () => {
    expect(() => Quantity.of('-1', 'quantity')).toThrow(
      new InvalidValueError('quantity', 'must not be negative'),
    );
  });

  it('adds and subtracts, refusing a negative result (RN07)', () => {
    const held = Quantity.of('100');

    expect(held.plus(Quantity.of('50')).toString()).toBe('150');
    expect(held.minus(Quantity.of('100')).isZero()).toBe(true);
    expect(() => held.minus(Quantity.of('101'))).toThrow(InvalidValueError);
  });

  it('compares and reports its decimal places', () => {
    expect(Quantity.of('10').isGreaterThan(Quantity.of('9.99'))).toBe(true);
    expect(Quantity.of('10').isGreaterThan(Quantity.of('10'))).toBe(false);
    expect(Quantity.of('10.0').equals(Quantity.of('10'))).toBe(true);
    expect(Quantity.of('0.0125').decimalPlaces()).toBe(4);
    expect(Quantity.zero().equals(Quantity.of('0'))).toBe(true);
  });

  it('serializes as the decimal string (RN11)', () => {
    expect(JSON.stringify({ quantity: Quantity.of('0.0125') })).toBe(
      '{"quantity":"0.0125"}',
    );
  });
});
