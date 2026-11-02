import { InvalidValueError } from '../../../shared/domain/domain-error';

export const PASSWORD_MIN_LENGTH = 8;
// Upper bound keeps the cost of hashing a request bounded (argon2 hashes the whole input).
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 150;

/** Plain password as typed at sign-up (RN01): at least 8 characters. Never stored or logged; only its hash is. */
export class PlainPassword {
  private constructor(private readonly secret: string) {}

  static of(value: string): PlainPassword {
    const length = [...value].length;
    if (length < PASSWORD_MIN_LENGTH) {
      throw new InvalidValueError(
        'password',
        `must have at least ${PASSWORD_MIN_LENGTH} characters`,
      );
    }
    if (length > PASSWORD_MAX_LENGTH) {
      throw new InvalidValueError(
        'password',
        `must have at most ${PASSWORD_MAX_LENGTH} characters`,
      );
    }
    return new PlainPassword(value);
  }

  /** The secret itself, for the hasher only. */
  reveal(): string {
    return this.secret;
  }

  /** Accidental logging or serialization never shows the secret. */
  toString(): string {
    return '[redacted]';
  }

  toJSON(): string {
    return '[redacted]';
  }
}

/** Name shown in the app (RN01): trimmed, 1 to 150 characters (users.name). */
export class PersonName {
  private constructor(private readonly value: string) {}

  static of(value: string): PersonName {
    const name = value.trim();
    if (name.length === 0 || [...name].length > NAME_MAX_LENGTH) {
      throw new InvalidValueError(
        'name',
        `must have between 1 and ${NAME_MAX_LENGTH} characters`,
      );
    }
    return new PersonName(name);
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
