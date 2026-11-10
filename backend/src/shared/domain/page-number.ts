import { InvalidValueError } from './domain-error';

/** A page or page size of a listing: an integer from 1 to max, else the code of the broken bound (D56). */
export function pageNumber(value: number, field: string, max: number): number {
  if (!Number.isInteger(value)) {
    throw new InvalidValueError(field, 'NOT_INTEGER', 'must be an integer');
  }
  if (value < 1) {
    throw new InvalidValueError(field, 'NOT_POSITIVE', 'must be at least 1');
  }
  if (value > max) {
    throw new InvalidValueError(field, 'TOO_LARGE', `must be at most ${max}`, {
      max,
    });
  }
  return value;
}
