import { PlainPassword } from '../domain/credentials';
import { Email } from '../domain/email';
import {
  EmailAlreadyRegisteredError,
  NewUser,
  PasswordHash,
  PasswordHasher,
  StoredUser,
  UserRepository,
} from '../domain/user';
import { GetUserProfile } from './get-user-profile.use-case';
import { RegisterUser } from './register-user.use-case';
import { VerifyCredentials } from './verify-credentials.use-case';

/** Reversible fake hasher: enough to check what reaches the repository and what is verified. */
class FakeHasher extends PasswordHasher {
  readonly verified: string[] = [];

  hash(password: PlainPassword): Promise<PasswordHash> {
    return Promise.resolve(`hashed:${password.reveal()}` as PasswordHash);
  }

  verify(hash: PasswordHash, candidate: string): Promise<boolean> {
    this.verified.push(hash);
    return Promise.resolve(hash === `hashed:${candidate}`);
  }
}

class InMemoryUsers extends UserRepository {
  readonly rows: StoredUser[] = [];

  create(user: NewUser): Promise<StoredUser> {
    if (
      this.rows.some((row) => Email.of(row.profile.email).equals(user.email))
    ) {
      return Promise.reject(new EmailAlreadyRegisteredError());
    }
    const stored: StoredUser = {
      profile: {
        id: `user-${this.rows.length + 1}`,
        name: user.name.toString(),
        email: user.email.toString(),
      },
      passwordHash: user.passwordHash,
    };
    this.rows.push(stored);
    return Promise.resolve(stored);
  }

  findByEmail(email: Email): Promise<StoredUser | null> {
    return Promise.resolve(
      this.rows.find((row) => Email.of(row.profile.email).equals(email)) ??
        null,
    );
  }

  findById(id: string): Promise<StoredUser | null> {
    return Promise.resolve(
      this.rows.find((row) => row.profile.id === id) ?? null,
    );
  }
}

describe('RegisterUser (RN01)', () => {
  let users: InMemoryUsers;
  let register: RegisterUser;

  beforeEach(() => {
    users = new InMemoryUsers();
    register = new RegisterUser(users, new FakeHasher());
  });

  it('stores only the hash of the password and returns the profile without it', async () => {
    const profile = await register.execute({
      name: '  Ana Souza ',
      email: 'ana@example.com',
      password: 'segredo123',
    });

    expect(profile).toEqual({
      id: 'user-1',
      name: 'Ana Souza',
      email: 'ana@example.com',
    });
    expect(users.rows[0].passwordHash).toBe('hashed:segredo123');
    expect(JSON.stringify(profile)).not.toContain('segredo123');
  });

  it('rejects an e-mail already registered with other casing (RN01)', async () => {
    await register.execute({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'segredo123',
    });

    await expect(
      register.execute({
        name: 'Ana 2',
        email: 'ANA@Example.com',
        password: 'segredo123',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
  });

  it.each([
    ['a short password', { password: '1234567' }, 'password'],
    ['a blank name', { name: '   ' }, 'name'],
    ['a malformed e-mail', { email: 'ana' }, 'email'],
  ])('rejects %s before hashing (RN01)', async (_case, override, field) => {
    await expect(
      register.execute({
        name: 'Ana',
        email: 'ana@example.com',
        password: 'segredo123',
        ...override,
      }),
    ).rejects.toMatchObject({ field });
    expect(users.rows).toHaveLength(0);
  });
});

describe('VerifyCredentials (A2)', () => {
  let users: InMemoryUsers;
  let hasher: FakeHasher;
  let verify: VerifyCredentials;

  beforeEach(async () => {
    users = new InMemoryUsers();
    hasher = new FakeHasher();
    verify = new VerifyCredentials(users, hasher);
    await verify.onModuleInit();
    await new RegisterUser(users, hasher).execute({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'segredo123',
    });
    hasher.verified.length = 0;
  });

  it('returns the profile for the right e-mail (any casing) and password', async () => {
    await expect(
      verify.execute('ANA@example.com', 'segredo123'),
    ).resolves.toEqual({
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
    });
  });

  it('returns null for a wrong password', async () => {
    await expect(
      verify.execute('ana@example.com', 'errada123'),
    ).resolves.toBeNull();
  });

  it.each([
    ['an unknown e-mail', 'bia@example.com'],
    ['a malformed e-mail', 'not-an-email'],
  ])(
    'returns null for %s after verifying against a dummy hash (no timing hint)',
    async (_case, email) => {
      await expect(verify.execute(email, 'segredo123')).resolves.toBeNull();
      expect(hasher.verified).toEqual([
        'hashed:timing-equalizer-not-a-real-password',
      ]);
    },
  );

  it('propagates unexpected errors from the repository', async () => {
    jest.spyOn(users, 'findByEmail').mockRejectedValue(new Error('db down'));

    await expect(
      verify.execute('ana@example.com', 'segredo123'),
    ).rejects.toThrow('db down');
  });

  it('propagates errors of Email that are not validation errors', async () => {
    jest.spyOn(Email, 'of').mockImplementationOnce(() => {
      throw new TypeError('bug');
    });

    await expect(verify.execute('ana@example.com', 'x')).rejects.toThrow(
      TypeError,
    );
  });
});

describe('GetUserProfile', () => {
  it('returns the profile or null', async () => {
    const users = new InMemoryUsers();
    await new RegisterUser(users, new FakeHasher()).execute({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'segredo123',
    });
    const getProfile = new GetUserProfile(users);

    await expect(getProfile.execute('user-1')).resolves.toEqual({
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
    });
    await expect(getProfile.execute('missing')).resolves.toBeNull();
  });
});
