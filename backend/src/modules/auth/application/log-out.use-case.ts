import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/domain/clock';
import { RefreshTokens, SessionRepository } from '../domain/session';

/** Ends the session family of the presented refresh token. Idempotent: no token or an unknown one is not an error. */
@Injectable()
export class LogOut {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly refreshTokens: RefreshTokens,
    private readonly clock: Clock,
  ) {}

  async execute(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }
    const session = await this.sessions.findByTokenHash(
      this.refreshTokens.hashOf(refreshToken),
    );
    if (session) {
      await this.sessions.revokeFamily(session.familyId, this.clock.now());
    }
  }
}
