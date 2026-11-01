import { InvalidValueError } from '../../../shared/domain/domain-error';

// Pragmatic shape check (local@domain.tld); deliverability is not verified in S1.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX_LENGTH = 254;

/**
 * E-mail of a user (RN01). Kept as typed (trimmed); uniqueness ignores case because the column is citext, and
 * `equals` follows the same rule.
 */
export class Email {
  private constructor(private readonly address: string) {}

  static of(value: string): Email {
    const address = value.trim();
    if (address.length > EMAIL_MAX_LENGTH || !EMAIL_SHAPE.test(address)) {
      throw new InvalidValueError('email', 'must be a valid e-mail address');
    }
    return new Email(address);
  }

  equals(other: Email): boolean {
    return this.address.toLowerCase() === other.address.toLowerCase();
  }

  toString(): string {
    return this.address;
  }

  toJSON(): string {
    return this.address;
  }
}
