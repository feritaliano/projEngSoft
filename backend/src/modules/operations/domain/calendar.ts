// Month arithmetic on ISO dates (YYYY-MM-DD), which compare chronologically as strings.

const pad = (value: number, size = 2) => String(value).padStart(size, '0');

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The same day `months` months later (or earlier, if negative); the last day of the month when it is shorter. */
export function plusMonths(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const index = year * 12 + (month - 1) + months;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${pad(y, 4)}-${pad(m)}-${pad(Math.min(day, daysInMonth(y, m)))}`;
}

export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function nextMonthStart(date: string): string {
  return plusMonths(monthStart(date), 1);
}

export function isLastDayOfMonth(date: string): boolean {
  const [year, month, day] = date.split('-').map(Number);
  return day === daysInMonth(year, month);
}

/** The date `days` calendar days later (or earlier, if negative). */
export function plusDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}
