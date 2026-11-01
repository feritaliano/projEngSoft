import { Injectable } from '@nestjs/common';
import {
  RegisterUser,
  RegisterUserCommand,
} from '../../users/application/register-user.use-case';
import { AuthSession, SessionIssuer } from './session-issuer';

/** A1 + A2: the new user is logged in right away (UX flow "cadastro → carteira"). */
@Injectable()
export class SignUp {
  constructor(
    private readonly registerUser: RegisterUser,
    private readonly issuer: SessionIssuer,
  ) {}

  async execute(command: RegisterUserCommand): Promise<AuthSession> {
    const user = await this.registerUser.execute(command);
    return this.issuer.start(user);
  }
}
