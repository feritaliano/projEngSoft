import { Injectable, Logger } from '@nestjs/common';
import { Clock } from '../../../shared/domain/clock';
import { GetUserProfile } from '../../users/application/get-user-profile.use-case';
import {
  InvalidRefreshTokenError,
  RefreshTokens,
  refreshTokenState,
  SessionRepository,
} from '../domain/session';
import { AuthSession, SessionIssuer } from './session-issuer';

/**
 * Rotating refresh (D39): a valid token is revoked and replaced by a new one of the same family; a revoked token
 * presented again (leak, replay or a concurrent refresh) revokes the whole family. Every failure is
 * InvalidRefreshTokenError.
 */
@Injectable()
export class RefreshSession {
  private readonly logger = new Logger(RefreshSession.name);

  constructor(
    private readonly sessions: SessionRepository,
    private readonly refreshTokens: RefreshTokens,
    private readonly getUserProfile: GetUserProfile,
    private readonly issuer: SessionIssuer,
    private readonly clock: Clock,
  ) {}

  async execute(refreshToken: string | undefined): Promise<AuthSession> {
    try {
      return await this.refresh(refreshToken);
    } catch (error) {
      if (error instanceof InvalidRefreshTokenError) {
        // Why a session ended, for support; never the token itself.
        this.logger.log({ reason: error.reason }, 'Refresh rejected');
      }
      throw error;
    }
  }

  private async refresh(
    refreshToken: string | undefined,
  ): Promise<AuthSession> {
    if (!refreshToken) {
      throw new InvalidRefreshTokenError('missing');
    }
    const current = await this.sessions.findByTokenHash(
      this.refreshTokens.hashOf(refreshToken),
    );
    if (!current) {
      throw new InvalidRefreshTokenError('unknown');
    }
    const state = refreshTokenState(current, this.clock.now());
    if (state === 'reused') {
      await this.revokeFamily(current.familyId, current.userId);
      throw new InvalidRefreshTokenError('reused');
    }
    if (state === 'expired') {
      throw new InvalidRefreshTokenError('expired');
    }

    const user = await this.getUserProfile.execute(current.userId);
    if (!user) {
      throw new InvalidRefreshTokenError('user-not-found');
    }
    const next = await this.issuer.rotate(current, user);
    if (!next) {
      // Another request rotated this token first: same treatment as a replay.
      await this.revokeFamily(current.familyId, current.userId);
      throw new InvalidRefreshTokenError('reused');
    }
    return next;
  }

  private async revokeFamily(familyId: string, userId: string): Promise<void> {
    this.logger.warn(
      { userId, familyId },
      'Revoked refresh token presented again: revoking its session family',
    );
    await this.sessions.revokeFamily(familyId, this.clock.now());
  }
}
