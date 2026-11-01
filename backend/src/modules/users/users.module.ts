import { Module } from '@nestjs/common';
import { GetUserProfile } from './application/get-user-profile.use-case';
import { RegisterUser } from './application/register-user.use-case';
import { VerifyCredentials } from './application/verify-credentials.use-case';
import { PasswordHasher, UserRepository } from './domain/user';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';

/** Owns the users table (arquitetura 7.2); other modules use only the exported use cases. */
@Module({
  providers: [
    RegisterUser,
    VerifyCredentials,
    GetUserProfile,
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
  ],
  exports: [RegisterUser, VerifyCredentials, GetUserProfile],
})
export class UsersModule {}
