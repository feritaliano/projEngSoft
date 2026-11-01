import { InMemorySessionRepository } from '../../../../test/fakes/in-memory-session.repository';
import { Clock } from '../../../shared/domain/clock';
import { GetUserProfile } from '../../users/application/get-user-profile.use-case';
import { RegisterUser } from '../../users/application/register-user.use-case';
import { VerifyCredentials } from '../../users/application/verify-credentials.use-case';
import {
  EmailAlreadyRegisteredError,
  UserProfile,
} from '../../users/domain/user';
import {
  AccessTokens,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  RefreshTokens,
  refreshTokenState,
  StoredSession,
  TokenHash,
} from '../domain/session';
import { LogIn } from './log-in.use-case';
import { LogOut } from './log-out.use-case';
import { RefreshSession } from './refresh-session.use-case';
import { authSettingsFrom, SessionIssuer } from './session-issuer';
import { SignUp } from './sign-up.use-case';

const ANA: UserProfile = {
  id: 'user-1',
  name: 'Ana',
  email: 'ana@example.com',
};
const DAY_MS = 24 * 60 * 60 * 1000;

class FixedClock extends Clock {
  constructor(public current = new Date('2026-11-04T12:00:00Z')) {
    super();
  }

  now(): Date {
    return this.current;
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

/** Sequential tokens, hashed with a visible prefix, so tests can tell them apart. */
class CountingRefreshTokens extends RefreshTokens {
  private next = 1;

  generate() {
    const token = `refresh-${this.next++}`;
    return { token, hash: this.hashOf(token) };
  }

  hashOf(token: string): TokenHash {
    return `hash(${token})` as TokenHash;
  }
}

class FakeAccessTokens extends AccessTokens {
  sign(userId: string) {
    return Promise.resolve({ token: `access-for-${userId}`, expiresIn: 900 });
  }

  verify(): Promise<string | null> {
    return Promise.resolve(null);
  }
}

function setup(profile: UserProfile | null = ANA) {
  const sessions = new InMemorySessionRepository();
  const clock = new FixedClock();
  const refreshTokens = new CountingRefreshTokens();
  const issuer = new SessionIssuer(
    sessions,
    new FakeAccessTokens(),
    refreshTokens,
    clock,
    {
      refreshTokenTtlDays: 7,
      secureCookies: false,
    },
  );
  const getUserProfile = {
    execute: jest.fn().mockResolvedValue(profile),
  } as unknown as GetUserProfile;
  return {
    sessions,
    clock,
    issuer,
    refresh: new RefreshSession(
      sessions,
      refreshTokens,
      getUserProfile,
      issuer,
      clock,
    ),
    logOut: new LogOut(sessions, refreshTokens, clock),
  };
}

describe('refreshTokenState (D39)', () => {
  const session: StoredSession = {
    id: 's1',
    userId: 'u1',
    familyId: 'f1',
    expiresAt: new Date('2026-11-10T00:00:00Z'),
    revokedAt: null,
  };

  it('is valid before expiry, expired at and after it', () => {
    expect(refreshTokenState(session, new Date('2026-11-09T23:59:59Z'))).toBe(
      'valid',
    );
    expect(refreshTokenState(session, new Date('2026-11-10T00:00:00Z'))).toBe(
      'expired',
    );
  });

  it('is reused when the session was already revoked, even if not expired', () => {
    expect(
      refreshTokenState(
        { ...session, revokedAt: new Date('2026-11-05T00:00:00Z') },
        new Date('2026-11-06T00:00:00Z'),
      ),
    ).toBe('reused');
  });
});

describe('authSettingsFrom', () => {
  it('uses Secure cookies only in production and the refresh TTL from the env', () => {
    expect(
      authSettingsFrom({ NODE_ENV: 'production', REFRESH_TOKEN_TTL_DAYS: 7 }),
    ).toEqual({
      refreshTokenTtlDays: 7,
      secureCookies: true,
    });
    expect(
      authSettingsFrom({ NODE_ENV: 'development', REFRESH_TOKEN_TTL_DAYS: 3 }),
    ).toEqual({
      refreshTokenTtlDays: 3,
      secureCookies: false,
    });
  });
});

describe('SessionIssuer', () => {
  it('starts a new family whose refresh token expires after the configured days and is stored only as a hash', async () => {
    const { sessions, issuer, clock } = setup();

    const session = await issuer.start(ANA);

    expect(session).toEqual({
      accessToken: 'access-for-user-1',
      expiresIn: 900,
      refreshToken: 'refresh-1',
      refreshTokenExpiresAt: new Date(clock.now().getTime() + 7 * DAY_MS),
      user: ANA,
    });
    expect(sessions.rows).toEqual([
      expect.objectContaining({
        userId: 'user-1',
        tokenHash: 'hash(refresh-1)',
        revokedAt: null,
      }),
    ]);
    expect(JSON.stringify(sessions.rows)).not.toContain('"refresh-1"');
  });

  it('starts a different family on each login', async () => {
    const { sessions, issuer } = setup();

    await issuer.start(ANA);
    await issuer.start(ANA);

    expect(sessions.rows[0].familyId).not.toBe(sessions.rows[1].familyId);
  });
});

describe('SignUp and LogIn (A1, A2)', () => {
  it('sign-up registers the user and starts a session', async () => {
    const { issuer } = setup();
    const register = {
      execute: jest.fn().mockResolvedValue(ANA),
    } as unknown as RegisterUser;

    const session = await new SignUp(register, issuer).execute({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'segredo123',
    });

    expect(session.user).toEqual(ANA);
  });

  it('sign-up propagates EmailAlreadyRegisteredError without creating a session (RN01)', async () => {
    const { issuer, sessions } = setup();
    const register = {
      execute: jest.fn().mockRejectedValue(new EmailAlreadyRegisteredError()),
    } as unknown as RegisterUser;

    await expect(
      new SignUp(register, issuer).execute({
        name: 'Ana',
        email: 'ana@example.com',
        password: 'segredo123',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
    expect(sessions.rows).toHaveLength(0);
  });

  it('login starts a session for valid credentials', async () => {
    const { issuer } = setup();
    const verify = {
      execute: jest.fn().mockResolvedValue(ANA),
    } as unknown as VerifyCredentials;

    await expect(
      new LogIn(verify, issuer).execute('ana@example.com', 'segredo123'),
    ).resolves.toMatchObject({
      user: ANA,
    });
  });

  it('login rejects invalid credentials with one generic error (A2)', async () => {
    const { issuer, sessions } = setup();
    const verify = {
      execute: jest.fn().mockResolvedValue(null),
    } as unknown as VerifyCredentials;

    await expect(
      new LogIn(verify, issuer).execute('ana@example.com', 'errada'),
    ).rejects.toThrow(new InvalidCredentialsError());
    expect(sessions.rows).toHaveLength(0);
  });
});

describe('RefreshSession (D39)', () => {
  it('rotates: revokes the presented token and issues a new one in the same family', async () => {
    const { issuer, refresh, sessions } = setup();
    const first = await issuer.start(ANA);

    const second = await refresh.execute(first.refreshToken);

    expect(second).toMatchObject({
      refreshToken: 'refresh-2',
      accessToken: 'access-for-user-1',
      user: ANA,
    });
    expect(sessions.rows.map((row) => row.revokedAt !== null)).toEqual([
      true,
      false,
    ]);
    expect(sessions.rows[0].familyId).toBe(sessions.rows[1].familyId);
  });

  it.each([
    ['no cookie', undefined, 'missing'],
    ['an unknown token', 'never-issued', 'unknown'],
  ])('rejects %s', async (_case, token, reason) => {
    await expect(setup().refresh.execute(token)).rejects.toMatchObject({
      reason,
    });
  });

  it('rejects an expired token without revoking its family or other families', async () => {
    const { issuer, refresh, clock, sessions } = setup();
    const first = await issuer.start(ANA);
    clock.advance(6 * DAY_MS);
    await issuer.start(ANA);
    clock.advance(DAY_MS);

    await expect(refresh.execute(first.refreshToken)).rejects.toMatchObject({
      reason: 'expired',
    });
    expect(sessions.active()).toHaveLength(2);
  });

  it('rotates nothing when signing the access token fails, so the client keeps a usable refresh token', async () => {
    const sessions = new InMemorySessionRepository();
    const clock = new FixedClock();
    const refreshTokens = new CountingRefreshTokens();
    const failingAccess = new FakeAccessTokens();
    const issuer = new SessionIssuer(
      sessions,
      failingAccess,
      refreshTokens,
      clock,
      {
        refreshTokenTtlDays: 7,
        secureCookies: false,
      },
    );
    const refresh = new RefreshSession(
      sessions,
      refreshTokens,
      {
        execute: jest.fn().mockResolvedValue(ANA),
      } as unknown as GetUserProfile,
      issuer,
      clock,
    );
    const first = await issuer.start(ANA);
    jest
      .spyOn(failingAccess, 'sign')
      .mockRejectedValueOnce(new Error('kms down'));

    await expect(refresh.execute(first.refreshToken)).rejects.toThrow(
      'kms down',
    );
    expect(sessions.active()).toHaveLength(1);
    await expect(refresh.execute(first.refreshToken)).resolves.toMatchObject({
      user: ANA,
    });
  });

  it('revokes the whole family when a revoked token is presented again (reuse detection, D39)', async () => {
    const { issuer, refresh, sessions } = setup();
    const stolen = await issuer.start(ANA);
    const legit = await refresh.execute(stolen.refreshToken);

    await expect(refresh.execute(stolen.refreshToken)).rejects.toMatchObject({
      reason: 'reused',
    });

    expect(sessions.active()).toHaveLength(0);
    await expect(refresh.execute(legit.refreshToken)).rejects.toMatchObject({
      reason: 'reused',
    });
  });

  it('keeps other families (other devices) when one family is revoked', async () => {
    const { issuer, refresh, sessions } = setup();
    const laptop = await issuer.start(ANA);
    await issuer.start(ANA);
    await refresh.execute(laptop.refreshToken);

    await expect(refresh.execute(laptop.refreshToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );

    expect(sessions.active()).toHaveLength(1);
  });

  it('treats losing a concurrent rotation as reuse and revokes the family', async () => {
    const { issuer, refresh, sessions } = setup();
    const first = await issuer.start(ANA);
    jest.spyOn(sessions, 'rotate').mockResolvedValueOnce(false);

    await expect(refresh.execute(first.refreshToken)).rejects.toMatchObject({
      reason: 'reused',
    });
    expect(sessions.active()).toHaveLength(0);
  });

  it('rejects the refresh of a user that no longer exists', async () => {
    const { issuer, refresh } = setup(null);
    const first = await issuer.start(ANA);

    await expect(refresh.execute(first.refreshToken)).rejects.toMatchObject({
      reason: 'user-not-found',
    });
  });
});

describe('LogOut', () => {
  it('revokes the family of the presented token', async () => {
    const { issuer, refresh, logOut, sessions } = setup();
    const first = await issuer.start(ANA);
    const second = await refresh.execute(first.refreshToken);

    await logOut.execute(second.refreshToken);

    expect(sessions.active()).toHaveLength(0);
  });

  it('is idempotent: no token or an unknown one is not an error', async () => {
    const { logOut, sessions } = setup();

    await expect(logOut.execute(undefined)).resolves.toBeUndefined();
    await expect(logOut.execute('never-issued')).resolves.toBeUndefined();
    expect(sessions.rows).toHaveLength(0);
  });
});
