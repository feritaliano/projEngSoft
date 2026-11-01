import { Injectable } from '@nestjs/common';
import { VerifyCredentials } from '../../users/application/verify-credentials.use-case';
import { InvalidCredentialsError } from '../domain/session';
import { AuthSession, SessionIssuer } from './session-issuer';

/** A2: login by e-mail and password; any mismatch is the same InvalidCredentialsError. */
@Injectable()
export class LogIn {
  constructor(
    private readonly verifyCredentials: VerifyCredentials,
    private readonly issuer: SessionIssuer,
  ) {}

  async execute(email: string, password: string): Promise<AuthSession> {
    const user = await this.verifyCredentials.execute(email, password);
    if (!user) {
      throw new InvalidCredentialsError();
    }
    return this.issuer.start(user);
  }
}
