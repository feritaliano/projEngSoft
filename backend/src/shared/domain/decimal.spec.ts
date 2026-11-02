import BaseDecimal from 'decimal.js';
import { Decimal, toDecimal } from './decimal';
import { InvalidValueError } from './domain-error';

describe('toDecimal (RN11, D5)', () => {
  it.each(['0', '12', '-3.5', '0.00000001', '123456789012345678.12345678'])(
    'accepts the plain decimal string %s',
    (value) => {
      expect(toDecimal(value, 'x').toFixed()).toBe(value);
    },
  );

  it.each([
    '',
    '1e3',
    '0x1f',
    'Infinity',
    'NaN',
    '1,5',
    ' 1',
    '1.',
    '.5',
    '+1',
  ])('rejects %j', (value) => {
    expect(() => toDecimal(value, 'price')).toThrow(
      new InvalidValueError(
        'price',
        'must be a plain decimal string (e.g. "1234.56")',
      ),
    );
  });

  it('rejects a non-finite Decimal', () => {
    expect(() => toDecimal(new Decimal(Infinity), 'price')).toThrow(
      InvalidValueError,
    );
    expect(() => toDecimal(new Decimal(NaN), 'price')).toThrow(
      'price must be a finite number',
    );
  });

  it.each([
    ['a number (binary floating point)', 10.1],
    ['null', null],
    ['an object', { value: '1' }],
  ])('rejects %s arriving through loosely typed input', (_case, value) => {
    expect(() => toDecimal(value as unknown as string, 'fees')).toThrow(
      new InvalidValueError('fees', 'must be a decimal string or Decimal'),
    );
  });

  it('re-wraps a Decimal built with another configuration in the domain precision', () => {
    const lowPrecision = BaseDecimal.clone({ precision: 5 });

    const value = toDecimal(new lowPrecision('1'), 'x').dividedBy(3);

    expect(value.toFixed()).toBe('0.3333333333333333333333333333333333333333');
  });
});
