import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { Email } from '../domain/email';
import {
  EmailAlreadyRegisteredError,
  NewUser,
  PasswordHash,
  StoredUser,
  UserRepository,
} from '../domain/user';

const USER_FIELDS = {
  id: true,
  name: true,
  email: true,
  passwordHash: true,
} as const;

interface UserRow {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

function toStoredUser(row: UserRow): StoredUser {
  return {
    profile: { id: row.id, name: row.name, email: row.email },
    passwordHash: row.passwordHash as PasswordHash,
  };
}

/** Unique violation (P2002) on users.email, the only unique column of the table besides the id. */
function isEmailTaken(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(user: NewUser): Promise<StoredUser> {
    try {
      const row = await this.prisma.user.create({
        data: {
          name: user.name.toString(),
          email: user.email.toString(),
          passwordHash: user.passwordHash,
        },
        select: USER_FIELDS,
      });
      return toStoredUser(row);
    } catch (error) {
      if (isEmailTaken(error)) {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }
  }

  // users.email is citext: the lookup ignores case in the database.
  async findByEmail(email: Email): Promise<StoredUser | null> {
    const row = await this.prisma.user.findUnique({
      where: { email: email.toString() },
      select: USER_FIELDS,
    });
    return row ? toStoredUser(row) : null;
  }

  async findById(id: string): Promise<StoredUser | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      select: USER_FIELDS,
    });
    return row ? toStoredUser(row) : null;
  }
}
