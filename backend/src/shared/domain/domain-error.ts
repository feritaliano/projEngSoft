/**
 * Base of every business-rule error. The presentation layer maps each `code` to an HTTP problem (e.g. 422); the
 * domain never knows about HTTP.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/**
 * Why a field was rejected (D56): a closed list, the same on every endpoint. The client picks the text to show by
 * `field` + code (microcopy, section 10), so a new code is a contract change.
 */
export const FIELD_ERROR_CODES = [
  'REQUIRED',
  'INVALID_FORMAT',
  'INVALID_VALUE',
  'TOO_SHORT',
  'TOO_LONG',
  'FUTURE_DATE',
  'NOT_POSITIVE',
  'NEGATIVE',
  'NOT_INTEGER',
  'INVALID_STEP',
  'TOO_MANY_DECIMALS',
  'TOO_LARGE',
  'NOT_FOUND',
  'ALREADY_EXISTS',
] as const;

export type FieldErrorCode = (typeof FIELD_ERROR_CODES)[number];

/** The limit the text shows (D56), so the client never repeats the rule. */
export interface FieldErrorParams {
  readonly min?: number;
  readonly max?: number;
  readonly maxDecimals?: number;
  readonly maxIntegerDigits?: number;
  /** Decimal string, e.g. "0.01". */
  readonly step?: string;
  /** YYYY-MM-DD, today in São Paulo (D54). */
  readonly today?: string;
}

/** A value that breaks an invariant of a value object or domain entity (e.g. negative quantity, price zero). */
export class InvalidValueError extends DomainError {
  constructor(
    readonly field: string,
    readonly code: FieldErrorCode,
    readonly reason: string,
    readonly params?: FieldErrorParams,
  ) {
    super(`${field} ${reason}`);
  }
}
