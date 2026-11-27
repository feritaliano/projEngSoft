import { LocalDate } from '../../../shared/domain/local-date';

const DAY_MS = 86_400_000;

/** YYYY-MM-DD of a calendar date, or null when it does not exist (e.g. 31/02). */
export function toIsoDate(
  year: number,
  month: number,
  day: number,
): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  const exists =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  return exists ? date.toISOString().slice(0, 10) : null;
}

export function utcMidnight(date: LocalDate): Date {
  return new Date(`${date.toString()}T00:00:00Z`);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return LocalDate.parse(
    new Date(utcMidnight(date).getTime() + days * DAY_MS)
      .toISOString()
      .slice(0, 10),
  );
}

/** Monday to Friday: the B3 never trades on weekends; holidays are found by the missing file (NO_FILE). */
export function isWeekday(date: LocalDate): boolean {
  const day = utcMidnight(date).getUTCDay();
  return day !== 0 && day !== 6;
}

export function weekdaysBetween(from: LocalDate, to: LocalDate): LocalDate[] {
  const days: LocalDate[] = [];
  for (let day = from; !day.isAfter(to); day = addDays(day, 1)) {
    if (isWeekday(day)) days.push(day);
  }
  return days;
}

/** Time of day of the daily ingestion, in the business time zone. */
export interface DailyTime {
  readonly hour: number;
  readonly minute: number;
}

/** "21:30" → { hour: 21, minute: 30 }; the format is validated by the env schema. */
export function parseDailyTime(value: string): DailyTime {
  const [hour, minute] = value.split(':').map(Number);
  return { hour, minute };
}

/** Offset of the time zone at an instant, in ms east of UTC: its wall clock there, read as if it were UTC, minus it. */
function offsetMs(instant: Date, timeZone: string): number {
  const wall = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })
      .formatToParts(instant)
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute', number>;
  const asUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
  );
  return asUtc - Math.floor(instant.getTime() / 60_000) * 60_000;
}

/** The instant of a wall-clock time on a date in a time zone. */
function zonedInstant(
  date: LocalDate,
  time: DailyTime,
  timeZone: string,
): Date {
  const [year, month, day] = date.toString().split('-').map(Number);
  const wall = Date.UTC(year, month - 1, day, time.hour, time.minute);
  return new Date(wall - offsetMs(new Date(wall), timeZone));
}

/** Next weekday at the given time in the time zone, strictly after now (K6 daily ingestion). */
export function nextDailyRun(
  now: Date,
  time: DailyTime,
  timeZone: string,
): { readonly at: Date; readonly day: LocalDate } {
  let day = LocalDate.todayIn(now, timeZone);
  for (;;) {
    const at = zonedInstant(day, time, timeZone);
    if (isWeekday(day) && at > now) return { at, day };
    day = addDays(day, 1);
  }
}
