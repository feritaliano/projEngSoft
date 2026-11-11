import { LocalDate } from './local-date';

/** Time zone of the B3 and of the users (D54): "today" for dates without time, like the trade date (RN04). */
export const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';

/** Port for the current time, so rules that depend on "now" (session expiry, RN04 no future dates) are testable. */
export abstract class Clock {
  abstract now(): Date;

  /** The calendar date of now in São Paulo (D54), whatever the time zone of the server. */
  today(): LocalDate {
    return LocalDate.todayIn(this.now(), BUSINESS_TIME_ZONE);
  }
}
