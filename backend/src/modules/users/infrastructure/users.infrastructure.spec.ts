import { Prisma } from '../../../generated/prisma/client';
import type { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { PersonName, PlainPassword } from '../domain/credentials';
import { Email } from '../domain/email';
import { EmailAlreadyRegisteredError, PasswordHash } from '../domain/user';
import { Argon2PasswordHasher } from './argon2-password-hasher';
import { PrismaUserRepository } from './prisma-user.repository';

describe('Argon2PasswordHasher (RN01)', () => {
  const hasher = new Argon2PasswordHasher();
  const password = PlainPassword.of('segredo123');

  it('hashes with argon2id and verifies only the right password', async () => {
    const hash = await hasher.hash(password);

    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
    expect(hash).not.toContain('segredo123');
    await expect(hasher.verify(hash, 'segredo123')).resolves.toBe(true);
    await expect(hasher.verify(hash, 'segredo124')).resolves.toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hasher.hash(password)).not.toBe(await hasher.hash(password));
  });

  it('throws on a corrupted stored hash instead of answering "wrong password"', async () => {
    await expect(
      hasher.verify('not-a-hash' as PasswordHash, 'segredo123'),
    ).rejects.toThrow();
  });
});

describe('PrismaUserRepository', () => {
  const row = {
    id: 'u1',
    name: 'Ana',
    email: 'Ana@Example.com',
    passwordHash: '$argon2id$hash',
  };
  const newUser = {
    name: PersonName.of('Ana'),
    email: Email.of('Ana@Example.com'),
    passwordHash: '$argon2id$hash' as PasswordHash,
  };

  function repositoryWith(user: Record<string, jest.Mock>) {
    return new PrismaUserRepository({ user } as unknown as PrismaService);
  }

  it('stores the name and the e-mail as typed and keeps the hash apart from the profile', async () => {
    const create = jest.fn().mockResolvedValue(row);

    const stored = await repositoryWith({ create }).create(newUser);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'Ana',
          email: 'Ana@Example.com',
          passwordHash: '$argon2id$hash',
        },
      }),
    );
    expect(stored).toEqual({
      profile: { id: 'u1', name: 'Ana', email: 'Ana@Example.com' },
      passwordHash: '$argon2id$hash',
    });
  });

  it('maps the unique violation of users.email (P2002) to EmailAlreadyRegisteredError (RN01)', async () => {
    const uniqueViolation = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '7.10.1' },
    );
    const repository = repositoryWith({
      create: jest.fn().mockRejectedValue(uniqueViolation),
    });

    await expect(repository.create(newUser)).rejects.toBeInstanceOf(
      EmailAlreadyRegisteredError,
    );
  });

  it('propagates any other database error', async () => {
    const otherError = new Prisma.PrismaClientKnownRequestError(
      'Connection lost',
      { code: 'P1001', clientVersion: '7.10.1' },
    );
    const repository = repositoryWith({
      create: jest.fn().mockRejectedValue(otherError),
    });

    await expect(repository.create(newUser)).rejects.toBe(otherError);
  });

  it('finds by e-mail and by id, returning null when absent', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(row);
    const repository = repositoryWith({ findUnique });

    await expect(
      repository.findByEmail(Email.of('ana@example.com')),
    ).resolves.toMatchObject({ profile: { id: 'u1' } });
    await expect(repository.findById('missing')).resolves.toBeNull();
    await expect(repository.findById('u1')).resolves.toMatchObject({
      passwordHash: '$argon2id$hash',
    });
    expect(findUnique).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { email: 'ana@example.com' } }),
    );
  });
});
