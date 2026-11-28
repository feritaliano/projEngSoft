import { LocalDate } from '../../../shared/domain/local-date';
import {
  addDays,
  isWeekday,
  nextDailyRun,
  parseDailyTime,
  previousDailyRun,
  toIsoDate,
  weekdaysBetween,
} from './business-days';

const day = (iso: string) => LocalDate.parse(iso);
const SAO_PAULO = 'America/Sao_Paulo';
const AT_2130 = { hour: 21, minute: 30 };

describe('business days (K6)', () => {
  it('builds ISO dates and refuses dates that do not exist', () => {
    expect(toIsoDate(2026, 11, 5)).toBe('2026-11-05');
    expect(toIsoDate(2026, 2, 31)).toBeNull();
  });

  it('adds days across months and years', () => {
    expect(addDays(day('2026-12-30'), 3).toString()).toBe('2027-01-02');
    expect(addDays(day('2026-03-01'), -1).toString()).toBe('2026-02-28');
  });

  it('tells weekdays from weekends', () => {
    expect(isWeekday(day('2026-11-27'))).toBe(true); // Friday
    expect(isWeekday(day('2026-11-28'))).toBe(false); // Saturday
    expect(isWeekday(day('2026-11-29'))).toBe(false); // Sunday
  });

  it('lists the weekdays of a period, holidays included (they end as NO_FILE)', () => {
    expect(
      weekdaysBetween(day('2026-11-19'), day('2026-11-24')).map(String),
    ).toEqual(['2026-11-19', '2026-11-20', '2026-11-23', '2026-11-24']);
  });

  it('parses the daily time of the env', () => {
    expect(parseDailyTime('21:30')).toEqual(AT_2130);
  });

  describe('nextDailyRun (São Paulo, UTC−3)', () => {
    it('is today when the time has not come yet', () => {
      const next = nextDailyRun(
        new Date('2026-11-25T12:00:00-03:00'),
        AT_2130,
        SAO_PAULO,
      );
      expect(next.day.toString()).toBe('2026-11-25');
      expect(next.at.toISOString()).toBe('2026-11-26T00:30:00.000Z');
    });

    it('is the next weekday once the time has passed, skipping the weekend', () => {
      const next = nextDailyRun(
        new Date('2026-11-27T21:30:00-03:00'),
        AT_2130,
        SAO_PAULO,
      );
      expect(next.day.toString()).toBe('2026-11-30');
      expect(next.at.toISOString()).toBe('2026-12-01T00:30:00.000Z');
    });

    it('starts from the São Paulo date, not the UTC one', () => {
      // 01:00 UTC on Saturday is still Friday 22:00 in São Paulo.
      const next = nextDailyRun(
        new Date('2026-11-28T01:00:00Z'),
        AT_2130,
        SAO_PAULO,
      );
      expect(next.day.toString()).toBe('2026-11-30');
    });

    it('works in a zone east of UTC', () => {
      const next = nextDailyRun(
        new Date('2026-11-25T08:00:00Z'),
        AT_2130,
        'Asia/Tokyo',
      );
      expect(next.at.toISOString()).toBe('2026-11-25T12:30:00.000Z');
    });

    it('works in a zone at UTC', () => {
      const next = nextDailyRun(
        new Date('2026-11-25T08:00:00Z'),
        AT_2130,
        'UTC',
      );
      expect(next.at.toISOString()).toBe('2026-11-25T21:30:00.000Z');
    });
  });

  describe('previousDailyRun (São Paulo): the weekday whose run a worker started now has missed', () => {
    const previous = (now: string) =>
      previousDailyRun(new Date(now), AT_2130, SAO_PAULO).toString();

    it('is today once the time has come', () => {
      expect(previous('2026-11-25T21:30:00-03:00')).toBe('2026-11-25');
      expect(previous('2026-11-25T23:59:00-03:00')).toBe('2026-11-25');
    });

    it('is the previous weekday before the time, never today', () => {
      expect(previous('2026-11-25T21:29:00-03:00')).toBe('2026-11-24');
      expect(previous('2026-11-30T10:00:00-03:00')).toBe('2026-11-27'); // Monday → Friday
    });

    it('is Friday on the weekend, from the São Paulo date', () => {
      expect(previous('2026-11-28T10:00:00-03:00')).toBe('2026-11-27');
      expect(previous('2026-11-29T23:00:00-03:00')).toBe('2026-11-27');
    });
  });
});
