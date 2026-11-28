import { Decimal } from '../../../shared/domain/decimal';
import { InvalidValueError } from '../../../shared/domain/domain-error';
import { LocalDate } from '../../../shared/domain/local-date';
import { derivedValue } from './market-trace';

const AS_OF = LocalDate.parse('2026-11-28');

describe('derivedValue', () => {
  it('keeps the full precision in plain notation (RN11)', () => {
    expect(derivedValue('TWR', new Decimal('0.000001'), [], AS_OF).value).toBe(
      '0.000001',
    );
  });

  it.each([new Decimal(NaN), new Decimal(Infinity)])(
    'fails as a server fault, not a 400, on %s',
    (value) => {
      const error = (() => {
        try {
          derivedValue('TWR', value, [], AS_OF);
        } catch (thrown) {
          return thrown;
        }
      })();
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(InvalidValueError);
    },
  );
});
