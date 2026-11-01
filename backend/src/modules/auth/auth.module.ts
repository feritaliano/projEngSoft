import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import type { ApiEnv } from '../../config/env';
import { Clock } from '../../shared/domain/clock';
import { SystemClock } from '../../shared/infrastructure/system-clock';
import { UsersModule } from '../users/users.module';
import { LogIn } from './application/log-in.use-case';
import { LogOut } from './application/log-out.use-case';
import { RefreshSession } from './application/refresh-session.use-case';
import {
  AuthSettings,
  authSettingsFrom,
  SessionIssuer,
} from './application/session-issuer';
import { SignUp } from './application/sign-up.use-case';
import {
  AccessTokens,
  RefreshTokens,
  SessionRepository,
} from './domain/session';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository';
import {
  CryptoRefreshTokens,
  JwtAccessTokens,
} from './infrastructure/token-services';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/jwt-auth.guard';

/** Rate limit of sign-up and login, per client IP and route (A1/A2, backend prompt). */
export const AUTH_RATE_LIMIT = { ttl: 60_000, limit: 5 };

/** Owns ops.user_sessions (D39); registers the global JWT guard. */
@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<ApiEnv, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: { algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
    ThrottlerModule.forRoot([AUTH_RATE_LIMIT]),
  ],
  controllers: [AuthController],
  providers: [
    SignUp,
    LogIn,
    RefreshSession,
    LogOut,
    SessionIssuer,
    { provide: SessionRepository, useClass: PrismaSessionRepository },
    { provide: AccessTokens, useClass: JwtAccessTokens },
    { provide: RefreshTokens, useClass: CryptoRefreshTokens },
    { provide: Clock, useClass: SystemClock },
    {
      provide: AuthSettings,
      inject: [ConfigService],
      useFactory: (config: ConfigService<ApiEnv, true>): AuthSettings =>
        authSettingsFrom({
          NODE_ENV: config.get('NODE_ENV', { infer: true }),
          REFRESH_TOKEN_TTL_DAYS: config.get('REFRESH_TOKEN_TTL_DAYS', {
            infer: true,
          }),
        }),
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
