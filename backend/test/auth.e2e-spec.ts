import { Controller, Get } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { getOptionsToken } from '@nestjs/throttler';
import { createHash } from 'node:crypto';
import request from 'supertest';
import { CurrentUser } from '../src/shared/presentation/auth-context';
import type { AuthenticatedUser } from '../src/shared/presentation/auth-context';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import { createApiApp } from './utils/api-app';
import { truncateAllTables } from './utils/database';

const PROBLEM_JSON = 'application/problem+json; charset=utf-8';
const ANA = {
  name: 'Ana Souza',
  email: 'ana@example.com',
  password: 'segredo123',
};

/** A protected route: S1 has none before K3, so the guard is exercised here. */
@Controller('e2e-probe')
class ProtectedProbeController {
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}

function refreshCookieOf(response: request.Response): string {
  const header = response.headers['set-cookie'] as unknown as
    string[] | undefined;
  const cookie = header?.find((value) => value.startsWith('refresh_token='));
  if (!cookie) {
    throw new Error('response did not set the refresh cookie');
  }
  return cookie.split(';')[0];
}

function tokenOf(cookie: string): string {
  return cookie.slice('refresh_token='.length);
}

describe('Auth (E2E, RN01, A1, A2, D39)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createApiApp({
      controllers: [ProtectedProbeController],
      // The rate limit has its own suite below; here many requests come from the same IP.
      override: (builder) =>
        builder
          .overrideProvider(getOptionsToken())
          .useValue([{ ttl: 60_000, limit: 10_000 }]),
    });
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('signs up: 201, logged in, password stored only as an argon2id hash, refresh token only as SHA-256 (RN01, D39)', async () => {
    const response = await http()
      .post('/api/v1/auth/register')
      .send(ANA)
      .expect(201);

    expect(response.body).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { name: 'Ana Souza', email: 'ana@example.com' },
    });
    // Only the public profile: nothing like a password hash reaches the response.
    expect(Object.keys(response.body.user as object).sort()).toEqual([
      'email',
      'id',
      'name',
    ]);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: ANA.email },
    });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.passwordHash).not.toContain(ANA.password);
    const sessions = await prisma.userSession.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].tokenHash).toBe(
      createHash('sha256')
        .update(tokenOf(refreshCookieOf(response)))
        .digest('hex'),
    );
  });

  it('rejects the same e-mail with other casing: 409 with field "email" (RN01)', async () => {
    await http().post('/api/v1/auth/register').send(ANA).expect(201);

    const response = await http()
      .post('/api/v1/auth/register')
      .send({ ...ANA, email: 'ANA@Example.COM' })
      .expect(409);

    expect(response.headers['content-type']).toBe(PROBLEM_JSON);
    expect(response.body).toMatchObject({ status: 409, field: 'email' });
    expect(await prisma.user.count()).toBe(1);
  });

  it('rejects a password with fewer than 8 characters (RN01)', async () => {
    const response = await http()
      .post('/api/v1/auth/register')
      .send({ ...ANA, password: '1234567' })
      .expect(400);

    expect(response.headers['content-type']).toBe(PROBLEM_JSON);
    expect(response.body.errors).toHaveLength(1);
    expect(await prisma.user.count()).toBe(0);
  });

  it('logs in with the e-mail in any casing and the token opens protected routes (A2)', async () => {
    const signUp = await http()
      .post('/api/v1/auth/register')
      .send(ANA)
      .expect(201);

    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'Ana@Example.com', password: ANA.password })
      .expect(200);
    expect(Object.keys(login.body.user as object).sort()).toEqual([
      'email',
      'id',
      'name',
    ]);

    const me = await http()
      .get('/api/v1/e2e-probe/me')
      .set('Authorization', `Bearer ${login.body.accessToken as string}`)
      .expect(200);
    expect(me.body).toEqual({ id: signUp.body.user.id });
  });

  it('answers the same 401 for a wrong password and an unknown e-mail (A2)', async () => {
    await http().post('/api/v1/auth/register').send(ANA).expect(201);

    const wrongPassword = await http()
      .post('/api/v1/auth/login')
      .send({ email: ANA.email, password: 'errada123' })
      .expect(401);
    const unknownEmail = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'bia@example.com', password: ANA.password })
      .expect(401);

    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.detail).toBe('E-mail or password is incorrect.');
  });

  it('rejects protected routes without a valid token: 401 problem+json', async () => {
    const response = await http()
      .get('/api/v1/e2e-probe/me')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401);

    expect(response.headers['content-type']).toBe(PROBLEM_JSON);
    expect(response.headers['www-authenticate']).toBe('Bearer');
  });

  it('rejects an unsigned token (alg none), whatever its sub', async () => {
    const signUp = await http()
      .post('/api/v1/auth/register')
      .send(ANA)
      .expect(201);
    const header = Buffer.from('{"alg":"none","typ":"JWT"}').toString(
      'base64url',
    );
    const payload = Buffer.from(
      JSON.stringify({ sub: signUp.body.user.id as string }),
    ).toString('base64url');

    await http()
      .get('/api/v1/e2e-probe/me')
      .set('Authorization', `Bearer ${header}.${payload}.`)
      .expect(401);
  });

  it('lets only one of two simultaneous refreshes with the same cookie win, and revokes the family (D39)', async () => {
    const signUp = await http()
      .post('/api/v1/auth/register')
      .send(ANA)
      .expect(201);
    const cookie = refreshCookieOf(signUp);

    const responses = await Promise.all([
      http().post('/api/v1/auth/refresh').set('Cookie', cookie),
      http().post('/api/v1/auth/refresh').set('Cookie', cookie),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 401,
    ]);
    const sessions = await prisma.userSession.findMany();
    expect(sessions.every((session) => session.revokedAt !== null)).toBe(true);
  });

  it('keeps the health check public', async () => {
    await http().get('/api/v1/health').expect(200);
  });

  it('rotates the refresh cookie and revokes the whole family when an old one is reused (D39)', async () => {
    const signUp = await http()
      .post('/api/v1/auth/register')
      .send(ANA)
      .expect(201);
    const first = refreshCookieOf(signUp);

    const refreshed = await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', first)
      .expect(200);
    const second = refreshCookieOf(refreshed);
    expect(second).not.toBe(first);
    expect(refreshed.body.user).toEqual(signUp.body.user);

    // The old cookie again (a stolen copy): 401, and the legitimate new one dies with the family.
    const replay = await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', first)
      .expect(401);
    expect(String(replay.headers['set-cookie'])).toContain('refresh_token=;');
    await http().post('/api/v1/auth/refresh').set('Cookie', second).expect(401);

    const sessions = await prisma.userSession.findMany();
    expect(sessions).toHaveLength(2);
    expect(sessions.every((session) => session.revokedAt !== null)).toBe(true);
  });

  it('logs out: 204, cookie cleared, and the refresh token no longer works', async () => {
    const signUp = await http()
      .post('/api/v1/auth/register')
      .send(ANA)
      .expect(201);
    const cookie = refreshCookieOf(signUp);

    const logout = await http()
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .expect(204);
    expect(String(logout.headers['set-cookie'])).toContain('refresh_token=;');

    await http().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(401);
  });

  it('answers 401 to a refresh without cookie', async () => {
    const response = await http().post('/api/v1/auth/refresh').expect(401);

    expect(response.body.detail).toBe('The session has expired. Log in again.');
  });
});

describe('Auth rate limit (E2E)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createApiApp();
    await truncateAllTables(app.get(PrismaService));
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 429 problem+json after 5 login attempts per minute from the same client', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'ana@example.com', password: 'errada123' });

    for (let i = 0; i < 5; i += 1) {
      await attempt().expect(401);
    }
    const blocked = await attempt().expect(429);

    expect(blocked.headers['content-type']).toBe(PROBLEM_JSON);
    expect(blocked.body).toMatchObject({
      status: 429,
      title: 'Too Many Requests',
    });
  });

  it('answers 429 after 5 sign-up attempts per minute from the same client', async () => {
    // Invalid bodies (400) still count: the limit protects the endpoint, not only successful sign-ups.
    const attempt = () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'Ana', email: 'ana@example.com', password: 'short' });

    for (let i = 0; i < 5; i += 1) {
      await attempt().expect(400);
    }
    const blocked = await attempt().expect(429);

    expect(blocked.headers['content-type']).toBe(PROBLEM_JSON);
  });
});
