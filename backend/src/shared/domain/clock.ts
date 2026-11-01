/** Port for the current time, so rules that depend on "now" (session expiry, RN04 no future dates) are testable. */
export abstract class Clock {
  abstract now(): Date;
}
