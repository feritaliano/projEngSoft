import { InvalidValueError } from './domain-error';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Calendar date without time or time zone (trade date, ex-date), ISO 8601 "YYYY-MM-DD" as in the API. */
export class LocalDate {
  private constructor(private readonly iso: string) {}

  static parse(value: string, field = 'date'): LocalDate {
    const match = ISO_DATE.exec(value);
    if (!match) {
      throw new InvalidValueError(field, 'must be a date in YYYY-MM-DD format');
    }
    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const isRealDate =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
    if (!isRealDate) {
      throw new InvalidValueError(field, 'must be a valid calendar date');
    }
    return new LocalDate(value);
  }

  /** Negative, zero or positive, like Array.prototype.sort expects. ISO strings sort chronologically. */
  compareTo(other: LocalDate): number {
    return this.iso < other.iso ? -1 : this.iso > other.iso ? 1 : 0;
  }

  equals(other: LocalDate): boolean {
    return this.iso === other.iso;
  }

  toString(): string {
    return this.iso;
  }

  toJSON(): string {
    return this.iso;
  }
}
