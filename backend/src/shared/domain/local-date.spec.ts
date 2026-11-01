import { InvalidValueError } from './domain-error';
import { LocalDate } from './local-date';

describe('LocalDate', () => {
  it('parses ISO dates and orders them chronologically (RN09)', () => {
    const earlier = LocalDate.parse('2026-01-05');
    const later = LocalDate.parse('2026-10-28');

    expect(earlier.compareTo(later)).toBeLessThan(0);
    expect(later.compareTo(earlier)).toBeGreaterThan(0);
    expect(earlier.compareTo(LocalDate.parse('2026-01-05'))).toBe(0);
    expect(earlier.equals(LocalDate.parse('2026-01-05'))).toBe(true);
    expect(later.toString()).toBe('2026-10-28');
  });

  it.each(['2026-1-05', '05/01/2026', '2026-01-05T00:00:00Z', ''])(
    'rejects the format %j',
    (value) => {
      expect(() => LocalDate.parse(value, 'tradeDate')).toThrow(
        new InvalidValueError(
          'tradeDate',
          'must be a date in YYYY-MM-DD format',
        ),
      );
    },
  );

  it.each(['2026-02-29', '2026-13-01', '2026-04-31', '2026-00-10'])(
    'rejects the impossible date %s',
    (value) => {
      expect(() => LocalDate.parse(value)).toThrow(
        'date must be a valid calendar date',
      );
    },
  );

  it('accepts 29 February in a leap year', () => {
    expect(LocalDate.parse('2028-02-29').toString()).toBe('2028-02-29');
  });

  it('serializes as YYYY-MM-DD (API contract)', () => {
    expect(JSON.stringify({ date: LocalDate.parse('2026-01-05') })).toBe(
      '{"date":"2026-01-05"}',
    );
  });
});
