import { Injectable } from '@nestjs/common';
import { PersonName, PlainPassword } from '../domain/credentials';
import { Email } from '../domain/email';
import {
  PasswordHasher,
  profileOf,
  UserProfile,
  UserRepository,
} from '../domain/user';

export interface RegisterUserCommand {
  name: string;
  email: string;
  password: string;
}

/** RN01: sign-up with name, unique e-mail and a password of at least 8 characters, stored only as a hash. */
@Injectable()
export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(command: RegisterUserCommand): Promise<UserProfile> {
    const name = PersonName.of(command.name);
    const email = Email.of(command.email);
    const password = PlainPassword.of(command.password);
    const passwordHash = await this.hasher.hash(password);
    const user = await this.users.create({ name, email, passwordHash });
    return profileOf(user);
  }
}
