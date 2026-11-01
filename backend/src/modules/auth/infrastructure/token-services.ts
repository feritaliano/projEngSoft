import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonWebTokenError, JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import type { ApiEnv } from '../../../config/env';
import {
  AccessTokens,
  GeneratedRefreshToken,
  IssuedAccessToken,
  RefreshTokens,
  TokenHash,
} from '../domain/session';

interface AccessTokenPayload {
  sub: string;
}

/** HS256 JWT with only the user id (`sub`); lifetime JWT_ACCESS_TTL_SECONDS. */
@Injectable()
export class JwtAccessTokens extends AccessTokens {
  private readonly expiresIn: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService<ApiEnv, true>,
  ) {
    super();
    this.expiresIn = config.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
  }

  async sign(userId: string): Promise<IssuedAccessToken> {
    const token = await this.jwt.signAsync(
      { sub: userId } satisfies AccessTokenPayload,
      {
        expiresIn: this.expiresIn,
      },
    );
    return { token, expiresIn: this.expiresIn };
  }

  /**
   * Invalid signature, expired, not yet valid, malformed or without `sub`: all mean "not authenticated". Any other error
   * (e.g. a broken secret) propagates as a 500 instead of silently turning every request into a 401.
   */
  async verify(token: string): Promise<string | null> {
    try {
      const payload =
        await this.jwt.verifyAsync<Partial<AccessTokenPayload>>(token);
      return typeof payload.sub === 'string' && payload.sub.length > 0
        ? payload.sub
        : null;
    } catch (error) {
      // TokenExpiredError and NotBeforeError extend JsonWebTokenError.
      if (error instanceof JsonWebTokenError) {
        return null;
      }
      throw error;
    }
  }
}

/** 256 random bits, base64url; stored only as SHA-256 hex (ops.user_sessions.token_hash, D39). */
@Injectable()
export class CryptoRefreshTokens extends RefreshTokens {
  generate(): GeneratedRefreshToken {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: this.hashOf(token) };
  }

  hashOf(token: string): TokenHash {
    return createHash('sha256').update(token).digest('hex') as TokenHash;
  }
}
