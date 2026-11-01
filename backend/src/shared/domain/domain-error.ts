/**
 * Base of every business-rule error. The presentation layer maps each `code` to an HTTP problem (e.g. 422); the
 * domain never knows about HTTP.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A value that breaks an invariant of a value object or domain entity (e.g. negative quantity, price zero). */
export class InvalidValueError extends DomainError {
  readonly code = 'INVALID_VALUE';

  constructor(
    readonly field: string,
    readonly reason: string,
  ) {
    super(`${field} ${reason}`);
  }
}
