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
          'INVALID_FORMAT',
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

  it('takes today in the given time zone, not in the server one (D54)', () => {
    // 02:30 UTC on 1 Nov is still 31 Oct in São Paulo (UTC-3).
    const now = new Date('2026-11-01T02:30:00Z');

    expect(LocalDate.todayIn(now, 'America/Sao_Paulo').toString()).toBe(
      '2026-10-31',
    );
    expect(LocalDate.todayIn(now, 'UTC').toString()).toBe('2026-11-01');
  });

  it('tells whether a date is after another (RN04 no future dates)', () => {
    const today = LocalDate.parse('2026-11-09');

    expect(LocalDate.parse('2026-11-10').isAfter(today)).toBe(true);
    expect(LocalDate.parse('2026-11-09').isAfter(today)).toBe(false);
    expect(LocalDate.parse('2026-11-08').isAfter(today)).toBe(false);
  });
});
