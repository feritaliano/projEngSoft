import { Injectable, OnModuleInit } from '@nestjs/common';
import { InvalidValueError } from '../../../shared/domain/domain-error';
import { PlainPassword } from '../domain/credentials';
import { Email } from '../domain/email';
import {
  PasswordHash,
  PasswordHasher,
  profileOf,
  UserProfile,
  UserRepository,
} from '../domain/user';

/**
 * Checks an e-mail and password (login, A2). Returns the profile, or null for any mismatch: unknown e-mail, wrong
 * password or malformed e-mail all look the same to the caller, so the response never reveals which e-mails exist.
 * An unknown e-mail still pays for one hash verification, so the response time does not reveal it either.
 */
@Injectable()
export class VerifyCredentials implements OnModuleInit {
  private dummyHash: PasswordHash;

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.hasher.hash(
      PlainPassword.of('timing-equalizer-not-a-real-password'),
    );
  }

  async execute(email: string, password: string): Promise<UserProfile | null> {
    let parsed: Email;
    try {
      parsed = Email.of(email);
    } catch (error) {
      if (error instanceof InvalidValueError) {
        await this.hasher.verify(this.dummyHash, password);
        return null;
      }
      throw error;
    }
    const user = await this.users.findByEmail(parsed);
    if (!user) {
      await this.hasher.verify(this.dummyHash, password);
      return null;
    }
    return (await this.hasher.verify(user.passwordHash, password))
      ? profileOf(user)
      : null;
  }
}
