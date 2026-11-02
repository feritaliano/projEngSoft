import { DomainError } from '../../../shared/domain/domain-error';
import { PersonName, PlainPassword } from './credentials';
import { Email } from './email';

/** A password hash (argon2id encoded string). Branded so a plain password or any string cannot take its place. */
export type PasswordHash = string & { readonly __brand: 'PasswordHash' };

/** What other modules may know about a user: never the password hash. */
export interface UserProfile {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

/**
 * A stored user, with the hash needed to check credentials. Not a UserProfile (no structural subtyping), so it cannot
 * be passed where a profile is expected and leak the hash: profileOf is the only way out of the users module.
 */
export interface StoredUser {
  readonly profile: UserProfile;
  readonly passwordHash: PasswordHash;
}

export interface NewUser {
  readonly name: PersonName;
  readonly email: Email;
  readonly passwordHash: PasswordHash;
}

/** RN01: the e-mail is unique, ignoring case (citext). */
export class EmailAlreadyRegisteredError extends DomainError {
  readonly code = 'EMAIL_ALREADY_REGISTERED';

  constructor() {
    super('This e-mail is already registered');
  }
}

/** Port (users module owns the users table, arquitetura 7.2). */
export abstract class UserRepository {
  /** Throws EmailAlreadyRegisteredError when the e-mail is taken. */
  abstract create(user: NewUser): Promise<StoredUser>;
  abstract findByEmail(email: Email): Promise<StoredUser | null>;
  abstract findById(id: string): Promise<StoredUser | null>;
}

/** Port: one-way password hashing (argon2id in infrastructure). Only a password that passed RN01 is hashed. */
export abstract class PasswordHasher {
  abstract hash(password: PlainPassword): Promise<PasswordHash>;
  /** `candidate` is whatever was typed at login: it is checked, not validated. */
  abstract verify(hash: PasswordHash, candidate: string): Promise<boolean>;
}

export function profileOf(user: StoredUser): UserProfile {
  const { id, name, email } = user.profile;
  return { id, name, email };
}
