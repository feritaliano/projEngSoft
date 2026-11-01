import { Controller, Get, HttpStatus } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { configureApiApp } from '../../../configure-api-app';
import { InvalidValueError } from '../../../shared/domain/domain-error';
import type { AuthenticatedUser } from '../../../shared/presentation/auth-context';
import { CurrentUser } from '../../../shared/presentation/auth-context';
import { EmailAlreadyRegisteredError } from '../../users/domain/user';
import { LogIn } from '../application/log-in.use-case';
import { LogOut } from '../application/log-out.use-case';
import { RefreshSession } from '../application/refresh-session.use-case';
import { AuthSession, AuthSettings } from '../application/session-issuer';
import { SignUp } from '../application/sign-up.use-case';
import {
  AccessTokens,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
} from '../domain/session';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';

const SESSION: AuthSession = {
  accessToken: 'access-token',
  expiresIn: 900,
  refreshToken: 'refresh-token',
  refreshTokenExpiresAt: new Date('2026-11-11T12:00:00Z'),
  user: { id: 'user-1', name: 'Ana', email: 'ana@example.com' },
};

@Controller('probe')
class ProtectedProbeController {
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}

async function createApp(production = false) {
  const useCases = {
    signUp: { execute: jest.fn().mockResolvedValue(SESSION) },
    logIn: { execute: jest.fn().mockResolvedValue(SESSION) },
    refresh: { execute: jest.fn().mockResolvedValue(SESSION) },
    logOut: { execute: jest.fn().mockResolvedValue(undefined) },
  };
  const accessTokens = {
    verify: jest.fn((token: string) =>
      Promise.resolve(token === 'valid' ? 'user-1' : null),
    ),
  };
  const moduleRef = await Test.createTestingModule({
    imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }])],
    controllers: [AuthController, ProtectedProbeController],
    providers: [
      { provide: SignUp, useValue: useCases.signUp },
      { provide: LogIn, useValue: useCases.logIn },
      { provide: RefreshSession, useValue: useCases.refresh },
      { provide: LogOut, useValue: useCases.logOut },
      { provide: AccessTokens, useValue: accessTokens },
      {
        provide: AuthSettings,
        useValue: { refreshTokenTtlDays: 7, secureCookies: production },
      },
      { provide: APP_GUARD, useClass: JwtAuthGuard },
    ],
  }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
    { logger: false },
  );
  await configureApiApp(app, {
    corsOrigin: 'http://localhost:4200',
    production,
  });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return { app, useCases };
}

/** A browser deletes the cookie only if the clearing Set-Cookie has the same name and Path. */
function expectClearedRefreshCookie(header: unknown): void {
  const cookie = String(header);
  expect(cookie).toContain('refresh_token=;');
  expect(cookie).toContain('Path=/api/v1/auth');
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
}

const LOG_IN = { email: 'ana@example.com', password: 'segredo123' };
const SIGN_UP = {
  name: 'Ana',
  email: 'ana@example.com',
  password: 'segredo123',
};

describe('AuthController (A1, A2, D39)', () => {
  let app: NestFastifyApplication;
  let useCases: Awaited<ReturnType<typeof createApp>>['useCases'];

  beforeEach(async () => {
    ({ app, useCases } = await createApp());
  });

  afterEach(async () => {
    await app.close();
  });

  it('sign-up answers 201 with the access token, sets the httpOnly refresh cookie and is not cacheable', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: SIGN_UP,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      accessToken: 'access-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: SESSION.user,
    });
    expect(response.headers['cache-control']).toBe('no-store');
    const cookie = String(response.headers['set-cookie']);
    expect(cookie).toContain('refresh_token=refresh-token');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api/v1/auth');
    expect(cookie).toContain('Expires=Wed, 11 Nov 2026 12:00:00 GMT');
    expect(cookie).not.toContain('Secure');
    expect(response.body).not.toContain('refresh-token');
  });

  it('marks the refresh cookie Secure in production', async () => {
    await app.close();
    ({ app } = await createApp(true));

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: LOG_IN,
    });

    expect(String(response.headers['set-cookie'])).toContain('Secure');
  });

  it.each([
    ['a short password', { ...SIGN_UP, password: '1234567' }],
    ['a malformed e-mail', { ...SIGN_UP, email: 'ana' }],
    ['a missing name', { email: SIGN_UP.email, password: SIGN_UP.password }],
    ['an extra field', { ...SIGN_UP, role: 'admin' }],
  ])(
    'sign-up rejects %s with 400 problem+json (RN01)',
    async (_case, payload) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers['content-type']).toContain(
        'application/problem+json',
      );
      expect(useCases.signUp.execute).not.toHaveBeenCalled();
    },
  );

  it('maps a duplicated e-mail to 409 with field "email" (RN01)', async () => {
    useCases.signUp.execute.mockRejectedValueOnce(
      new EmailAlreadyRegisteredError(),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: SIGN_UP,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ status: 409, field: 'email' });
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('maps a domain validation error (e.g. a blank name) to 400 with its field', async () => {
    useCases.signUp.execute.mockRejectedValueOnce(
      new InvalidValueError('name', 'must have between 1 and 150 characters'),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: SIGN_UP,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      field: 'name',
      detail: 'name must have between 1 and 150 characters',
    });
  });

  it('login answers 200, and 401 with one generic message for bad credentials (A2)', async () => {
    const ok = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: LOG_IN,
    });
    useCases.logIn.execute.mockRejectedValueOnce(new InvalidCredentialsError());
    const bad = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: LOG_IN,
    });

    expect(ok.statusCode).toBe(200);
    expect(bad.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    expect(bad.json()).toMatchObject({
      detail: 'E-mail or password is incorrect.',
    });
  });

  it('propagates unexpected errors as a generic 500', async () => {
    useCases.logIn.execute.mockRejectedValueOnce(new Error('db down'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: LOG_IN,
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('db down');
  });

  it('refresh reads the cookie and rotates it', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: { refresh_token: 'old-token' },
    });

    expect(useCases.refresh.execute).toHaveBeenCalledWith('old-token');
    expect(response.statusCode).toBe(200);
    expect(String(response.headers['set-cookie'])).toContain(
      'refresh_token=refresh-token',
    );
  });

  it('refresh answers 401 and clears the cookie when the session is over (D39)', async () => {
    useCases.refresh.execute.mockRejectedValueOnce(
      new InvalidRefreshTokenError('reused'),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: { refresh_token: 'x' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      detail: 'The session has expired. Log in again.',
    });
    expectClearedRefreshCookie(response.headers['set-cookie']);
  });

  it('refresh does not clear the cookie on an unexpected error', async () => {
    useCases.refresh.execute.mockRejectedValueOnce(new Error('db down'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: { refresh_token: 'x' },
    });

    expect(response.statusCode).toBe(500);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('logout answers 204, revokes the cookie session and clears the cookie', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      cookies: { refresh_token: 'x' },
    });

    expect(response.statusCode).toBe(204);
    expect(useCases.logOut.execute).toHaveBeenCalledWith('x');
    expectClearedRefreshCookie(response.headers['set-cookie']);
  });

  it('logout clears the cookie even when revoking the session fails (500)', async () => {
    useCases.logOut.execute.mockRejectedValueOnce(new Error('db down'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      cookies: { refresh_token: 'x' },
    });

    expect(response.statusCode).toBe(500);
    expectClearedRefreshCookie(response.headers['set-cookie']);
  });

  describe('global JWT guard', () => {
    it.each([
      ['no Authorization header', {}],
      ['a non-Bearer scheme', { authorization: 'Basic dXNlcjpwYXNz' }],
      ['an invalid token', { authorization: 'Bearer forged' }],
      ['an empty Bearer', { authorization: 'Bearer ' }],
    ])('answers 401 problem+json with %s', async (_case, headers) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/probe/me',
        headers,
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers['content-type']).toContain(
        'application/problem+json',
      );
      expect(response.headers['www-authenticate']).toBe('Bearer');
    });

    it('lets a valid token through and exposes the user id to the route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/probe/me',
        headers: { authorization: 'Bearer valid' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ id: 'user-1' });
    });

    it('keeps the auth routes public', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
      });

      expect(response.statusCode).toBe(204);
    });
  });
});
