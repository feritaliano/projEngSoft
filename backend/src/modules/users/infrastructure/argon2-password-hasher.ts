import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { PlainPassword } from '../domain/credentials';
import { PasswordHash, PasswordHasher } from '../domain/user';

/** argon2id with the OWASP minimum (19 MiB, 2 iterations, 1 lane); parameters travel inside each hash. */
export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class Argon2PasswordHasher extends PasswordHasher {
  async hash(password: PlainPassword): Promise<PasswordHash> {
    return (await argon2.hash(
      password.reveal(),
      ARGON2_OPTIONS,
    )) as PasswordHash;
  }

  /** A malformed stored hash throws (data corruption must surface as a 500, not as a wrong password). */
  verify(hash: PasswordHash, candidate: string): Promise<boolean> {
    return argon2.verify(hash, candidate);
  }
}
