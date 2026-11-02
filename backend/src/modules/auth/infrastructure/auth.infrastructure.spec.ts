import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { ApiEnv } from '../../../config/env';
import type { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { SystemClock } from '../../../shared/infrastructure/system-clock';
import { TokenHash } from '../domain/session';
import { PrismaSessionRepository } from './prisma-session.repository';
import { CryptoRefreshTokens, JwtAccessTokens } from './token-services';

const SECRET = 'unit-test-secret-with-at-least-32-chars';

function accessTokens(secret = SECRET, ttl = 900) {
  const jwt = new JwtService({
    secret,
    signOptions: { algorithm: 'HS256' },
    verifyOptions: { algorithms: ['HS256'] },
  });
  const config = { get: () => ttl } as unknown as ConfigService<ApiEnv, true>;
  return { tokens: new JwtAccessTokens(jwt, config), jwt };
}

describe('JwtAccessTokens', () => {
  it('puts the configured lifetime in the exp claim', async () => {
    const { tokens, jwt } = accessTokens(SECRET, 120);

    const payload = jwt.decode<{ exp: number; iat: number }>(
      (await tokens.sign('user-1')).token,
    );

    expect(payload.exp - payload.iat).toBe(120);
  });

  it('propagates errors that are not about the token (e.g. a broken secret) instead of answering 401', async () => {
    const { tokens, jwt } = accessTokens();
    jest
      .spyOn(jwt, 'verifyAsync')
      .mockRejectedValueOnce(new TypeError('secret provider failed'));

    await expect(tokens.verify('any')).rejects.toThrow(TypeError);
  });

  it('signs the user id and verifies it back', async () => {
    const { tokens } = accessTokens();

    const issued = await tokens.sign('user-1');

    expect(issued.expiresIn).toBe(900);
    await expect(tokens.verify(issued.token)).resolves.toBe('user-1');
  });

  it('rejects a token signed with another secret', async () => {
    const forged = await accessTokens(
      'another-secret-with-at-least-32-chars!!',
    ).tokens.sign('user-1');

    await expect(
      accessTokens().tokens.verify(forged.token),
    ).resolves.toBeNull();
  });

  it('rejects an expired token', async () => {
    const { tokens, jwt } = accessTokens();
    const expired = await jwt.signAsync({ sub: 'user-1' }, { expiresIn: -10 });

    await expect(tokens.verify(expired)).resolves.toBeNull();
  });

  it.each([
    ['garbage', 'not.a.jwt'],
    [
      'an unsigned token (alg none)',
      'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ1c2VyLTEifQ.',
    ],
  ])('rejects %s', async (_case, token) => {
    await expect(accessTokens().tokens.verify(token)).resolves.toBeNull();
  });

  it.each([
    ['without sub', {}],
    ['with an empty sub', { sub: '' }],
    ['with a non-string sub', { sub: 42 }],
  ])('rejects a validly signed token %s', async (_case, payload) => {
    const { tokens, jwt } = accessTokens();

    await expect(
      tokens.verify(await jwt.signAsync(payload)),
    ).resolves.toBeNull();
  });
});

describe('CryptoRefreshTokens (D39)', () => {
  const refreshTokens = new CryptoRefreshTokens();

  it('generates 256-bit base64url tokens with their SHA-256 hex hash', () => {
    const { token, hash } = refreshTokens.generate();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(refreshTokens.hashOf(token)).toBe(hash);
  });

  it('never repeats a token', () => {
    expect(refreshTokens.generate().token).not.toBe(
      refreshTokens.generate().token,
    );
  });
});

describe('PrismaSessionRepository.rotate', () => {
  function repositoryWith(revokedCount: number) {
    const create = jest.fn();
    const updateMany = jest.fn().mockResolvedValue({ count: revokedCount });
    const tx = { userSession: { updateMany, create } };
    const prisma = {
      $transaction: (fn: (client: typeof tx) => Promise<boolean>) => fn(tx),
    } as unknown as PrismaService;
    return {
      repository: new PrismaSessionRepository(prisma),
      create,
      updateMany,
    };
  }
  const next = {
    userId: 'u1',
    familyId: 'f1',
    tokenHash: 'a'.repeat(64) as TokenHash,
    expiresAt: new Date(),
  };

  it('revokes only an active session and creates the next one', async () => {
    const { repository, create, updateMany } = repositoryWith(1);
    const now = new Date();

    await expect(repository.rotate('s1', next, now)).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 's1', revokedAt: null },
      data: { revokedAt: now },
    });
    expect(create).toHaveBeenCalledWith({ data: next });
  });

  it('creates nothing when the session was already revoked by a concurrent refresh', async () => {
    const { repository, create } = repositoryWith(0);

    await expect(repository.rotate('s1', next, new Date())).resolves.toBe(
      false,
    );
    expect(create).not.toHaveBeenCalled();
  });
});

describe('SystemClock', () => {
  it('returns the current time', () => {
    const before = Date.now();
    const now = new SystemClock().now().getTime();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});
