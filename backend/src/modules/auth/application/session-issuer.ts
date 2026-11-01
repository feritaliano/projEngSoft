import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Clock } from '../../../shared/domain/clock';
import { UserProfile } from '../../users/domain/user';
import {
  AccessTokens,
  RefreshTokens,
  SessionRepository,
  StoredSession,
} from '../domain/session';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Settings of the auth flow, from the validated env. */
export abstract class AuthSettings {
  abstract readonly refreshTokenTtlDays: number;
  /** Secure cookies need HTTPS: true in production, false for the local frontend on http://localhost. */
  abstract readonly secureCookies: boolean;
}

/** AuthSettings from the env values (kept as a function so the wiring is unit-tested). */
export function authSettingsFrom(env: {
  NODE_ENV: string;
  REFRESH_TOKEN_TTL_DAYS: number;
}): AuthSettings {
  return {
    refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
    secureCookies: env.NODE_ENV === 'production',
  };
}

/** What the presentation layer turns into the response body (access token) and the httpOnly cookie (refresh token). */
export interface AuthSession {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Date;
  readonly user: UserProfile;
}

/**
 * The only place that creates sessions: every AuthSession it returns matches a session stored with the hash of its
 * refresh token (D39). The access token is signed before anything is stored, so a signing failure never leaves a
 * stored (or rotated) session whose token the client did not receive.
 */
@Injectable()
export class SessionIssuer {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly accessTokens: AccessTokens,
    private readonly refreshTokens: RefreshTokens,
    private readonly clock: Clock,
    private readonly settings: AuthSettings,
  ) {}

  /** New family (sign-up or login). */
  async start(user: UserProfile): Promise<AuthSession> {
    const access = await this.accessTokens.sign(user.id);
    const refresh = this.refreshTokens.generate();
    const expiresAt = this.refreshExpiry();
    await this.sessions.create({
      userId: user.id,
      familyId: randomUUID(),
      tokenHash: refresh.hash,
      expiresAt,
    });
    return this.sessionFor(user, access, refresh.token, expiresAt);
  }

  /**
   * Next session of the same family: atomically revokes `current` and stores the new one. Null when `current` was
   * already revoked by a concurrent refresh (nothing is created).
   */
  async rotate(
    current: StoredSession,
    user: UserProfile,
  ): Promise<AuthSession | null> {
    const access = await this.accessTokens.sign(user.id);
    const refresh = this.refreshTokens.generate();
    const expiresAt = this.refreshExpiry();
    const rotated = await this.sessions.rotate(
      current.id,
      {
        userId: current.userId,
        familyId: current.familyId,
        tokenHash: refresh.hash,
        expiresAt,
      },
      this.clock.now(),
    );
    return rotated
      ? this.sessionFor(user, access, refresh.token, expiresAt)
      : null;
  }

  private sessionFor(
    user: UserProfile,
    access: { token: string; expiresIn: number },
    refreshToken: string,
    refreshTokenExpiresAt: Date,
  ): AuthSession {
    return {
      accessToken: access.token,
      expiresIn: access.expiresIn,
      refreshToken,
      refreshTokenExpiresAt,
      user,
    };
  }

  private refreshExpiry(): Date {
    return new Date(
      this.clock.now().getTime() + this.settings.refreshTokenTtlDays * DAY_MS,
    );
  }
}
